import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Execution, Prisma } from '../../../generated/prisma/client';
import { WORKFLOW_QUEUE } from '../queue/queue.constants';
import { WorkflowJobData } from '../queue/types';
import { WorkflowDefinition } from '@minizapier/shared';
import {
  ListExecutionsQueryDto,
  ExecutionStatsDto,
} from './dto/executions.dto';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WORKFLOW_QUEUE) private readonly workflowQueue: Queue,
  ) {}

  /**
   * Create a new execution and queue it for processing
   */
  async create(
    workflowId: string,
    userId: string,
    triggerData: unknown,
  ): Promise<Execution> {
    // Verify workflow exists and belongs to user
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Create execution record
    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        status: 'PENDING',
        input: triggerData as object,
      },
    });

    // Queue the job for processing
    const jobData: WorkflowJobData = {
      workflowId,
      executionId: execution.id,
      definition: workflow.definition as unknown as WorkflowDefinition,
      triggerData,
      userId,
    };

    await this.workflowQueue.add('execute', jobData, {
      jobId: execution.id,
    });

    this.logger.log(
      `Created execution ${execution.id} for workflow ${workflowId}`,
    );

    return execution;
  }

  /**
   * Find all executions with filtering and pagination
   */
  async findAll(
    userId: string,
    query: ListExecutionsQueryDto,
  ): Promise<{ executions: Execution[]; total: number }> {
    const {
      skip = 0,
      take = 20,
      workflowId,
      status,
      startedAfter,
      startedBefore,
    } = query;

    // Build where clause
    const where: Prisma.ExecutionWhereInput = {
      workflow: {
        userId,
      },
    };

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (status) {
      where.status = status;
    }

    if (startedAfter || startedBefore) {
      where.startedAt = {};
      if (startedAfter) {
        where.startedAt.gte = new Date(startedAfter);
      }
      if (startedBefore) {
        where.startedAt.lte = new Date(startedBefore);
      }
    }

    const [executions, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        skip,
        take,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.execution.count({ where }),
    ]);

    return { executions, total };
  }

  /**
   * Find a single execution by ID with step logs
   */
  async findOne(id: string, userId: string): Promise<Execution> {
    const execution = await this.prisma.execution.findFirst({
      where: {
        id,
        workflow: {
          userId,
        },
      },
      include: {
        steps: {
          orderBy: { createdAt: 'asc' },
        },
        workflow: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${id} not found`);
    }

    return execution;
  }

  /**
   * Get step logs for an execution
   */
  async getStepLogs(executionId: string, userId: string) {
    // Verify execution exists and user has access
    await this.findOne(executionId, userId);

    return this.prisma.stepLog.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Replay an execution from the beginning
   */
  async replay(executionId: string, userId: string): Promise<Execution> {
    const originalExecution = await this.findOne(executionId, userId);

    // Create new execution with same input
    return this.create(
      originalExecution.workflowId,
      userId,
      originalExecution.input,
    );
  }

  /**
   * Get execution statistics for a user
   */
  async getStats(
    userId: string,
    workflowId?: string,
  ): Promise<ExecutionStatsDto> {
    const where: Prisma.ExecutionWhereInput = {
      workflow: { userId },
    };

    if (workflowId) {
      where.workflowId = workflowId;
    }

    const [total, success, failed, running, pending] = await Promise.all([
      this.prisma.execution.count({ where }),
      this.prisma.execution.count({ where: { ...where, status: 'SUCCESS' } }),
      this.prisma.execution.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.execution.count({ where: { ...where, status: 'RUNNING' } }),
      this.prisma.execution.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    // Calculate average duration for completed executions
    const completedExecutions = await this.prisma.execution.findMany({
      where: {
        ...where,
        status: { in: ['SUCCESS', 'FAILED'] },
        finishedAt: { not: null },
      },
      select: {
        startedAt: true,
        finishedAt: true,
      },
    });

    let averageDuration: number | undefined;
    if (completedExecutions.length > 0) {
      const totalDuration = completedExecutions.reduce((sum, exec) => {
        if (exec.finishedAt) {
          return sum + (exec.finishedAt.getTime() - exec.startedAt.getTime());
        }
        return sum;
      }, 0);
      averageDuration = Math.round(totalDuration / completedExecutions.length);
    }

    return {
      total,
      success,
      failed,
      running,
      pending,
      averageDuration,
    };
  }

  /**
   * Cancel a pending or running execution
   */
  async cancel(executionId: string, userId: string): Promise<Execution> {
    const execution = await this.findOne(executionId, userId);

    if (execution.status !== 'PENDING' && execution.status !== 'RUNNING') {
      throw new Error('Can only cancel pending or running executions');
    }

    // Remove from queue if pending
    const job = await this.workflowQueue.getJob(executionId);
    if (job) {
      await job.remove();
    }

    // Update status to FAILED with cancellation message
    return this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        error: 'Execution cancelled by user',
        finishedAt: new Date(),
      },
    });
  }
}
