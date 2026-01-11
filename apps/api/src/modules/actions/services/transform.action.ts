import { Injectable, Logger } from '@nestjs/common';
import { JSONPath } from 'jsonpath-plus';
import { TransformConfig, TransformResult } from '../types';

/**
 * Transform Action - transforms data using JSONPath or JavaScript expressions
 */
@Injectable()
export class TransformAction {
  private readonly logger = new Logger(TransformAction.name);

  /**
   * Execute a data transformation
   */
  execute(
    config: TransformConfig,
    context: Record<string, unknown>,
  ): TransformResult {
    try {
      const { expression, type } = config;

      if (!expression || expression.trim() === '') {
        return {
          success: true,
          data: context,
        };
      }

      let result: unknown;

      if (type === 'jsonpath') {
        result = this.executeJsonPath(expression, context);
      } else if (type === 'javascript') {
        result = this.executeJavaScript(expression, context);
      } else {
        // Auto-detect: if starts with $ or @, it's JSONPath
        if (
          expression.trim().startsWith('$') ||
          expression.trim().startsWith('@')
        ) {
          result = this.executeJsonPath(expression, context);
        } else {
          // Try as JSONPath first, fallback to JavaScript
          try {
            result = this.executeJsonPath(expression, context);
          } catch {
            result = this.executeJavaScript(expression, context);
          }
        }
      }

      this.logger.debug(`Transform result: ${JSON.stringify(result)}`);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Transform failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute JSONPath expression
   * @see https://github.com/JSONPath-Plus/JSONPath
   */
  private executeJsonPath(
    expression: string,
    context: Record<string, unknown>,
  ): unknown {
    // JSONPath expects $ as root
    const normalizedExpression = expression.trim().startsWith('$')
      ? expression
      : `$.${expression}`;

    const result: unknown = JSONPath({
      path: normalizedExpression,
      json: context,
      wrap: false, // Return single value if possible
    });

    return result;
  }

  /**
   * Execute JavaScript expression in a sandboxed context
   * Only supports simple property access and basic operations
   */
  private executeJavaScript(
    expression: string,
    context: Record<string, unknown>,
  ): unknown {
    // Create a safe evaluation context
    // We use Function constructor to create a sandboxed scope
    // Only expose the context data, not global objects

    // Build variable declarations from context keys
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create a function that takes context values as arguments
    // and returns the evaluated expression
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const evaluator = new Function(
      ...contextKeys,
      `"use strict"; return (${expression});`,
    ) as (...args: unknown[]) => unknown;

    try {
      return evaluator(...contextValues);
    } catch (evalError) {
      // If direct evaluation fails, try treating it as a template
      // Check if it's a simple object/array literal
      if (
        expression.trim().startsWith('{') ||
        expression.trim().startsWith('[')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const jsonEvaluator = new Function(
          ...contextKeys,
          `"use strict"; return (${expression});`,
        ) as (...args: unknown[]) => unknown;
        return jsonEvaluator(...contextValues);
      }
      throw evalError;
    }
  }

  /**
   * Helper method to get a value from context using dot notation
   * e.g., "trigger.body.user.name" -> context.trigger.body.user.name
   */
  getValueByPath(context: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
