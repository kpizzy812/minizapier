import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkflowNode, WorkflowDefinition } from '@minizapier/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { WORKFLOW_QUEUE } from './queue.constants';
import { WorkflowJobData, ExecutionContext } from './types';
import { GraphTraverserService } from './services/graph-traverser.service';
import { StepExecutorService } from './services/step-executor.service';

/**
 * Scheduled job data from trigger scheduler
 */
interface ScheduledJobData {
  triggerId: string;
  workflowId: string;
  userId: string;
  isScheduled: true;
}

/**
 * BullMQ Processor for workflow execution.
 * Handles the execution of entire workflows, step by step.
 * Also processes scheduled trigger jobs.
 */
@Processor(WORKFLOW_QUEUE, {
  concurrency: 5,
})
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(GraphTraverserService)
    private readonly graphTraverser: GraphTraverserService,
    @Inject(StepExecutorService)
    private readonly stepExecutor: StepExecutorService,
  ) {
    super();
  }

  /**
   * Main job processor - routes to appropriate handler based on job type
   */
  async process(
    job: Job<WorkflowJobData | ScheduledJobData>,
  ): Promise<unknown> {
    // Check if this is a scheduled execution job
    if (job.name === 'scheduled-execution' && 'isScheduled' in job.data) {
      return this.processScheduledJob(job as Job<ScheduledJobData>);
    }

    // Otherwise, process as regular workflow execution
    return this.processWorkflowJob(job as Job<WorkflowJobData>);
  }

  /**
   * Process scheduled trigger job - creates execution and runs workflow
   */
  private async processScheduledJob(
    job: Job<ScheduledJobData>,
  ): Promise<unknown> {
    const { triggerId, workflowId, userId } = job.data;

    this.logger.log(
      `Processing scheduled trigger ${triggerId} for workflow ${workflowId}`,
    );

    try {
      // Get workflow with trigger
      const workflow = await this.prisma.workflow.findFirst({
        where: { id: workflowId, userId },
        include: { trigger: true },
      });

      if (!workflow) {
        this.logger.warn(
          `Workflow ${workflowId} not found for scheduled trigger ${triggerId}`,
        );
        return { success: false, error: 'Workflow not found' };
      }

      if (!workflow.isActive) {
        this.logger.log(
          `Workflow ${workflowId} is not active, skipping scheduled execution`,
        );
        return { success: false, error: 'Workflow is not active' };
      }

      // Build trigger data for scheduled execution
      const triggerData = {
        type: 'schedule',
        triggerId,
        scheduledAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      // Create execution record
      const execution = await this.prisma.execution.create({
        data: {
          workflowId,
          status: 'PENDING',
          input: triggerData as object,
        },
      });

      this.logger.log(
        `Created scheduled execution ${execution.id} for workflow ${workflowId}`,
      );

      // Execute the workflow inline (not queuing another job)
      const definition = workflow.definition as unknown as WorkflowDefinition;
      return this.executeWorkflow(
        execution.id,
        workflowId,
        definition,
        triggerData,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled trigger ${triggerId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Process regular workflow execution job
   */
  private async processWorkflowJob(
    job: Job<WorkflowJobData>,
  ): Promise<unknown> {
    const { executionId, definition, triggerData, workflowId } = job.data;
    return this.executeWorkflow(
      executionId,
      workflowId,
      definition,
      triggerData,
      job,
    );
  }

  /**
   * Execute workflow with given parameters
   */
  private async executeWorkflow(
    executionId: string,
    workflowId: string,
    definition: WorkflowDefinition,
    triggerData: unknown,
    job?: Job<WorkflowJobData>,
  ): Promise<unknown> {
    this.logger.log(
      `Starting workflow execution: ${executionId} for workflow: ${workflowId}`,
    );

    try {
      // Update execution status to RUNNING
      await this.updateExecutionStatus(executionId, 'RUNNING');

      // Initialize execution context with trigger data
      const context: ExecutionContext = {
        trigger: triggerData,
      };

      // Build execution order using topological sort
      const executionOrder =
        this.graphTraverser.buildExecutionOrder(definition);
      const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));

      // Track skipped nodes (due to condition branches)
      const skippedNodes = new Set<string>();

      // Execute nodes in order
      let lastOutput: unknown = triggerData;

      for (const orderItem of executionOrder) {
        const node = nodeMap.get(orderItem.nodeId);
        if (!node) {
          this.logger.warn(`Node ${orderItem.nodeId} not found in definition`);
          continue;
        }

        // Skip if this node was marked as skipped (condition branch)
        if (skippedNodes.has(node.id)) {
          await this.logStep(executionId, node, 'skipped', {
            input: null,
            output: null,
            duration: 0,
          });
          continue;
        }

        // Log step as running
        await this.logStep(executionId, node, 'running', {
          input: this.stepExecutor.isTriggerNode(node)
            ? triggerData
            : context[orderItem.dependsOn[0]] || context,
        });

        // Execute the step
        const result = await this.stepExecutor.executeStep(node, context);

        // Store output in context
        context[node.id] = result.output;
        lastOutput = result.output;

        // Update step log with result
        await this.updateStepLog(executionId, node.id, {
          status: result.success ? 'success' : 'error',
          output: result.output,
          error: result.error,
          duration: result.duration,
        });

        // If step failed, stop execution (unless retry logic is implemented)
        if (!result.success) {
          await this.updateExecutionStatus(executionId, 'FAILED', result.error);
          return {
            success: false,
            error: result.error,
            context,
          };
        }

        // Handle condition node branching
        if (this.stepExecutor.isConditionNode(node)) {
          const conditionResult = (result.output as { result: boolean }).result;
          const nodesToSkip = this.graphTraverser.findNodesToSkip(
            node.id,
            conditionResult,
            definition,
          );
          nodesToSkip.forEach((n) => skippedNodes.add(n));
        }

        // Update job progress (only if job exists)
        if (job) {
          const progress = Math.round(
            ((executionOrder.indexOf(orderItem) + 1) / executionOrder.length) *
              100,
          );
          await job.updateProgress(progress);
        }
      }

      // All steps completed successfully
      await this.updateExecutionStatus(
        executionId,
        'SUCCESS',
        null,
        lastOutput,
      );

      this.logger.log(`Workflow execution completed: ${executionId}`);

      return {
        success: true,
        output: lastOutput,
        context,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Workflow execution failed: ${executionId}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.updateExecutionStatus(executionId, 'FAILED', errorMessage);

      throw error;
    }
  }

  /**
   * Update execution status in database
   */
  private async updateExecutionStatus(
    executionId: string,
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PAUSED',
    error?: string | null,
    output?: unknown,
  ): Promise<void> {
    const updateData: Prisma.ExecutionUpdateInput = { status };

    if (error !== undefined) {
      updateData.error = error;
    }

    if (output !== undefined) {
      updateData.output = output as Prisma.InputJsonValue;
    }

    if (status === 'SUCCESS' || status === 'FAILED') {
      updateData.finishedAt = new Date();
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data: updateData,
    });
  }

  /**
   * Create step log entry
   */
  private async logStep(
    executionId: string,
    node: WorkflowNode,
    status: string,
    data: {
      input?: unknown;
      output?: unknown;
      error?: string;
      duration?: number;
    },
  ): Promise<void> {
    await this.prisma.stepLog.create({
      data: {
        executionId,
        nodeId: node.id,
        nodeName: node.data.label || node.type,
        status,
        input: data.input as object | undefined,
        output: data.output as object | undefined,
        error: data.error,
        duration: data.duration,
      },
    });
  }

  /**
   * Update existing step log
   */
  private async updateStepLog(
    executionId: string,
    nodeId: string,
    data: {
      status: string;
      output?: unknown;
      error?: string;
      duration?: number;
    },
  ): Promise<void> {
    // Find the most recent step log for this node
    const stepLog = await this.prisma.stepLog.findFirst({
      where: {
        executionId,
        nodeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (stepLog) {
      await this.prisma.stepLog.update({
        where: { id: stepLog.id },
        data: {
          status: data.status,
          output: data.output as object | undefined,
          error: data.error,
          duration: data.duration,
        },
      });
    }
  }

  /**
   * Event handler for completed jobs
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<WorkflowJobData>) {
    this.logger.log(
      `Job ${job.id} completed for execution ${job.data.executionId}`,
    );
  }

  /**
   * Event handler for failed jobs
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<WorkflowJobData> | undefined, error: Error) {
    if (job) {
      this.logger.error(
        `Job ${job.id} failed for execution ${job.data.executionId}: ${error.message}`,
      );
    } else {
      this.logger.error(`Job failed: ${error.message}`);
    }
  }

  /**
   * Event handler for worker errors
   */
  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Worker error: ${error.message}`);
  }
}
