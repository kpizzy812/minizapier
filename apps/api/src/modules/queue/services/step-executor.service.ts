import { Injectable, Logger } from '@nestjs/common';
import { WorkflowNode, NodeData, ConditionData } from '@minizapier/shared';
import { ExecutionContext, StepResult } from '../types';
import { TemplateResolverService } from './template-resolver.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';

/**
 * Service for executing individual workflow steps (nodes).
 * This is a placeholder implementation - real actions will be added in Block 5.
 */
@Injectable()
export class StepExecutorService {
  private readonly logger = new Logger(StepExecutorService.name);

  constructor(
    private readonly templateResolver: TemplateResolverService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Execute a single step and return the result
   */
  async executeStep(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Resolve templates in node data
      const resolvedData = this.templateResolver.resolveObject(
        node.data,
        context,
      );

      // Ensure async context for future real implementations
      await Promise.resolve();

      this.logger.debug(
        `Executing step ${node.id} (${node.type})`,
        JSON.stringify(resolvedData),
      );

      let output: unknown;

      switch (node.type) {
        case 'webhookTrigger':
        case 'scheduleTrigger':
        case 'emailTrigger':
          // Triggers just pass through the trigger data
          output = context.trigger;
          break;

        case 'condition':
          // Condition nodes evaluate their expression
          output = this.executeCondition(
            resolvedData as ConditionData,
            context,
          );
          break;

        case 'transform':
          output = this.executeTransform(resolvedData, context);
          break;

        case 'httpRequest':
          output = this.executeHttpRequest(resolvedData);
          break;

        case 'sendEmail':
          output = this.executeSendEmail(resolvedData);
          break;

        case 'sendTelegram':
          output = this.executeSendTelegram(resolvedData);
          break;

        case 'databaseQuery':
          output = this.executeDatabaseQuery(resolvedData);
          break;

        default: {
          // Handle unknown node types - should not happen with proper typing
          const unknownType = node.type as string;
          this.logger.warn(`Unknown node type: ${unknownType}`);
          output = { message: `Unknown node type: ${unknownType}` };
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Step ${node.id} completed in ${duration}ms`);

      return {
        success: true,
        output,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Step ${node.id} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Execute condition node - returns boolean result
   */
  private executeCondition(
    data: ConditionData,
    context: ExecutionContext,
  ): { result: boolean; expression: string } {
    const result = this.conditionEvaluator.evaluate(data.expression, context);
    return {
      result,
      expression: data.expression,
    };
  }

  /**
   * Execute transform node - transforms data using expression
   * Placeholder for Block 5
   */
  private executeTransform(data: NodeData, context: ExecutionContext): unknown {
    const transformData = data as { expression?: string };

    if (!transformData.expression) {
      return context;
    }

    // Simple JSON path-like transform
    // Full implementation will be in Block 5
    try {
      // If expression starts with $, treat as JSONPath
      // For now, just resolve templates
      const resolved = this.templateResolver.resolveString(
        transformData.expression,
        context,
      );

      // Try to parse as JSON if possible
      try {
        return JSON.parse(resolved) as unknown;
      } catch {
        return resolved;
      }
    } catch (error) {
      this.logger.error(
        `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Placeholder for HTTP Request action
   * Will be implemented in Block 5
   */
  private executeHttpRequest(data: NodeData): unknown {
    this.logger.debug('HTTP Request action - placeholder', data);
    return {
      status: 200,
      message: 'HTTP Request placeholder - will be implemented in Block 5',
      requestData: data,
    };
  }

  /**
   * Placeholder for Send Email action
   * Will be implemented in Block 5
   */
  private executeSendEmail(data: NodeData): unknown {
    this.logger.debug('Send Email action - placeholder', data);
    return {
      sent: true,
      message: 'Email placeholder - will be implemented in Block 5',
      emailData: data,
    };
  }

  /**
   * Placeholder for Send Telegram action
   * Will be implemented in Block 5
   */
  private executeSendTelegram(data: NodeData): unknown {
    this.logger.debug('Send Telegram action - placeholder', data);
    return {
      sent: true,
      message: 'Telegram placeholder - will be implemented in Block 5',
      telegramData: data,
    };
  }

  /**
   * Placeholder for Database Query action
   * Will be implemented in Block 5
   */
  private executeDatabaseQuery(data: NodeData): unknown {
    this.logger.debug('Database Query action - placeholder', data);
    return {
      rows: [],
      message: 'Database Query placeholder - will be implemented in Block 5',
      queryData: data,
    };
  }

  /**
   * Check if a node is a trigger type
   */
  isTriggerNode(node: WorkflowNode): boolean {
    return (
      node.type === 'webhookTrigger' ||
      node.type === 'scheduleTrigger' ||
      node.type === 'emailTrigger'
    );
  }

  /**
   * Check if a node is a condition type
   */
  isConditionNode(node: WorkflowNode): boolean {
    return node.type === 'condition';
  }
}
