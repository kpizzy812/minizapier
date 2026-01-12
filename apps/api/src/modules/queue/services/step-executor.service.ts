import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowNode,
  ConditionData,
  HttpRequestData,
  SendEmailData,
  SendTelegramData,
  DatabaseQueryData,
  TransformData,
  AIRequestData,
  RetryConfig,
} from '@minizapier/shared';
import { ExecutionContext, StepResult } from '../types';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 0, // No retry by default
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
};

/**
 * Extended step result with retry information
 */
export interface StepResultWithRetry extends StepResult {
  /** Number of retry attempts made */
  retryAttempts?: number;
  /** Whether the step succeeded after retries */
  retriedSuccessfully?: boolean;
}
import { TemplateResolverService } from './template-resolver.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import {
  HttpRequestAction,
  TransformAction,
  SendEmailAction,
  SendTelegramAction,
  DatabaseQueryAction,
  AIRequestAction,
} from '../../actions/services';
import { CredentialsService } from '../../credentials/credentials.service';
import {
  TelegramCredentialData,
  ResendCredentialData,
  DatabaseCredentialData,
  AICredentialData,
} from '../../credentials/dto/credentials.dto';

/**
 * Service for executing individual workflow steps (nodes).
 * Integrates with action services and credentials for real execution.
 */
@Injectable()
export class StepExecutorService {
  private readonly logger = new Logger(StepExecutorService.name);

  constructor(
    private readonly templateResolver: TemplateResolverService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly httpRequestAction: HttpRequestAction,
    private readonly transformAction: TransformAction,
    private readonly sendEmailAction: SendEmailAction,
    private readonly sendTelegramAction: SendTelegramAction,
    private readonly databaseQueryAction: DatabaseQueryAction,
    private readonly aiRequestAction: AIRequestAction,
    private readonly credentialsService: CredentialsService,
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
          output = this.executeCondition(
            resolvedData as ConditionData,
            context,
          );
          break;

        case 'transform':
          output = this.executeTransform(
            resolvedData as TransformData,
            context,
          );
          break;

        case 'httpRequest':
          output = await this.executeHttpRequest(
            resolvedData as HttpRequestData,
          );
          break;

        case 'sendEmail':
          output = await this.executeSendEmail(resolvedData as SendEmailData);
          break;

        case 'sendTelegram':
          output = await this.executeSendTelegram(
            resolvedData as SendTelegramData,
          );
          break;

        case 'databaseQuery':
          output = await this.executeDatabaseQuery(
            resolvedData as DatabaseQueryData,
          );
          break;

        case 'aiRequest':
          output = await this.executeAIRequest(resolvedData as AIRequestData);
          break;

        default: {
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
   * Execute a step with retry support.
   * Uses exponential backoff for retries.
   */
  async executeStepWithRetry(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<StepResultWithRetry> {
    // Get retry config from node data or use defaults
    const retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...node.data.retryConfig,
    };

    // If no retries configured, just execute normally
    if (retryConfig.maxAttempts <= 0) {
      return this.executeStep(node, context);
    }

    let lastResult: StepResult | null = null;
    let attempt = 0;

    while (attempt <= retryConfig.maxAttempts) {
      // Execute step
      const result = await this.executeStep(node, context);

      // If successful, return immediately
      if (result.success) {
        return {
          ...result,
          retryAttempts: attempt,
          retriedSuccessfully: attempt > 0,
        };
      }

      lastResult = result;
      attempt++;

      // If we've exhausted all retries, break
      if (attempt > retryConfig.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelayMs *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelayMs,
      );

      this.logger.warn(
        `Step ${node.id} failed (attempt ${attempt}/${retryConfig.maxAttempts}). ` +
          `Retrying in ${delay}ms. Error: ${result.error}`,
      );

      // Wait before retry
      await this.sleep(delay);
    }

    // All retries exhausted, return last result
    return {
      ...(lastResult as StepResult),
      retryAttempts: retryConfig.maxAttempts,
      retriedSuccessfully: false,
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * Execute transform node - transforms data using JSONPath or JS
   */
  private executeTransform(
    data: TransformData,
    context: ExecutionContext,
  ): unknown {
    if (!data.expression) {
      return context;
    }

    const result = this.transformAction.execute(
      {
        expression: data.expression,
        type: this.detectExpressionType(data.expression),
      },
      context as Record<string, unknown>,
    );

    if (!result.success) {
      throw new Error(result.error || 'Transform failed');
    }

    return result.data;
  }

  /**
   * Detect if expression is JSONPath or safe expression
   */
  private detectExpressionType(expression: string): 'jsonpath' | 'expression' {
    const trimmed = expression.trim();
    // JSONPath typically starts with $ or contains specific patterns
    if (
      trimmed.startsWith('$') ||
      trimmed.startsWith('@') ||
      trimmed.includes('[*]') ||
      trimmed.includes('..')
    ) {
      return 'jsonpath';
    }
    return 'expression';
  }

  /**
   * Execute HTTP Request action
   */
  private async executeHttpRequest(data: HttpRequestData): Promise<unknown> {
    // Get auth from credentials if specified
    let auth:
      | {
          type: 'basic' | 'bearer' | 'api_key';
          username?: string;
          password?: string;
          token?: string;
          apiKey?: string;
          headerName?: string;
        }
      | undefined;

    if (data.credentialId) {
      const authConfig = await this.credentialsService.getHttpAuthConfig(
        data.credentialId,
      );
      if (authConfig) {
        auth = authConfig;
      }
    }

    const result = await this.httpRequestAction.execute({
      method: data.method,
      url: data.url,
      headers: data.headers,
      body: data.body,
      auth,
    });

    if (!result.success) {
      throw new Error(result.error || 'HTTP request failed');
    }

    return result.data;
  }

  /**
   * Execute Send Email action
   */
  private async executeSendEmail(data: SendEmailData): Promise<unknown> {
    let apiKey: string | undefined;

    if (data.credentialId) {
      try {
        const credentialData = (await this.credentialsService.getCredentialData(
          data.credentialId,
        )) as ResendCredentialData;
        apiKey = credentialData.apiKey;
      } catch (error) {
        this.logger.warn(`Failed to get credential: ${error}`);
      }
    }

    const result = await this.sendEmailAction.execute({
      to: data.to,
      subject: data.subject,
      body: data.body,
      html: data.body.includes('<') && data.body.includes('>'),
      apiKey,
    });

    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }

    return result.data;
  }

  /**
   * Execute Send Telegram action
   */
  private async executeSendTelegram(data: SendTelegramData): Promise<unknown> {
    let botToken: string | undefined;

    if (data.credentialId) {
      try {
        const credentialData = (await this.credentialsService.getCredentialData(
          data.credentialId,
        )) as TelegramCredentialData;
        botToken = credentialData.botToken;
      } catch (error) {
        this.logger.warn(`Failed to get credential: ${error}`);
      }
    }

    const result = await this.sendTelegramAction.execute({
      chatId: data.chatId,
      message: data.message,
      parseMode: 'HTML',
      botToken,
    });

    if (!result.success) {
      throw new Error(result.error || 'Telegram send failed');
    }

    return result.data;
  }

  /**
   * Execute Database Query action
   */
  private async executeDatabaseQuery(
    data: DatabaseQueryData,
  ): Promise<unknown> {
    let connectionString: string | undefined;

    if (data.credentialId) {
      try {
        const credentialData = (await this.credentialsService.getCredentialData(
          data.credentialId,
        )) as DatabaseCredentialData;
        connectionString = credentialData.connectionString;
      } catch (error) {
        this.logger.warn(`Failed to get credential: ${error}`);
      }
    }

    const result = await this.databaseQueryAction.execute({
      query: data.query,
      connectionString,
    });

    if (!result.success) {
      throw new Error(result.error || 'Database query failed');
    }

    return result.data;
  }

  /**
   * Execute AI Request action
   */
  private async executeAIRequest(data: AIRequestData): Promise<unknown> {
    let apiKey: string | undefined;
    let baseUrl: string | undefined;
    let model: string | undefined;

    if (data.credentialId) {
      try {
        const credentialData = (await this.credentialsService.getCredentialData(
          data.credentialId,
        )) as AICredentialData;
        apiKey = credentialData.apiKey;
        baseUrl = credentialData.baseUrl;
        model = credentialData.model;
      } catch (error) {
        this.logger.warn(`Failed to get AI credential: ${error}`);
      }
    }

    const result = await this.aiRequestAction.execute({
      prompt: data.prompt,
      systemPrompt: data.systemPrompt,
      outputSchema: data.outputSchema,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      apiKey,
      baseUrl,
      model,
    });

    if (!result.success) {
      throw new Error(result.error || 'AI request failed');
    }

    return result.data;
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
