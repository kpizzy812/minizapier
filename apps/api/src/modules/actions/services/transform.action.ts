import { Injectable, Logger } from '@nestjs/common';
import { JSONPath } from 'jsonpath-plus';
import { Parser } from 'expr-eval';
import { TransformConfig, TransformResult } from '../types';

/**
 * Transform Action - transforms data using JSONPath or safe expressions
 *
 * Security: Uses expr-eval instead of eval/Function to prevent code injection.
 * expr-eval only allows mathematical and logical expressions, no access to
 * global objects, require, process, or any dangerous APIs.
 */
@Injectable()
export class TransformAction {
  private readonly logger = new Logger(TransformAction.name);
  private readonly parser: Parser;

  constructor() {
    // Create a safe expression parser with limited functions
    this.parser = new Parser({
      operators: {
        // Enable safe operators
        add: true,
        concatenate: true,
        conditional: true,
        divide: true,
        factorial: false, // Disable to prevent DoS
        multiply: true,
        power: true,
        remainder: true,
        subtract: true,
        logical: true,
        comparison: true,
        in: true,
        assignment: false, // Disable assignment for safety
      },
    });

    // Add safe utility functions
    this.parser.functions.length = (arr: unknown[]) =>
      Array.isArray(arr) ? arr.length : 0;
    this.parser.functions.toLowerCase = (s: string) =>
      typeof s === 'string' ? s.toLowerCase() : '';
    this.parser.functions.toUpperCase = (s: string) =>
      typeof s === 'string' ? s.toUpperCase() : '';
    this.parser.functions.trim = (s: string) =>
      typeof s === 'string' ? s.trim() : '';
    this.parser.functions.toString = (v: unknown) => String(v);
    this.parser.functions.toNumber = (v: unknown) => Number(v) || 0;
    this.parser.functions.isNull = (v: unknown) => v === null || v === undefined;
    this.parser.functions.coalesce = (...args: unknown[]) =>
      args.find((a) => a !== null && a !== undefined);
  }

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
      } else if (type === 'expression') {
        result = this.executeSafeExpression(expression, context);
      } else {
        // Auto-detect: if starts with $ or @, it's JSONPath
        if (
          expression.trim().startsWith('$') ||
          expression.trim().startsWith('@')
        ) {
          result = this.executeJsonPath(expression, context);
        } else {
          // Try as JSONPath first, fallback to safe expression
          try {
            result = this.executeJsonPath(expression, context);
          } catch {
            result = this.executeSafeExpression(expression, context);
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
   * Execute expression using safe expr-eval parser
   * No access to global objects, require, process, etc.
   */
  private executeSafeExpression(
    expression: string,
    context: Record<string, unknown>,
  ): unknown {
    // Flatten nested context for easier access in expressions
    const flatContext = this.flattenContext(context);

    try {
      const parsed = this.parser.parse(expression);
      // expr-eval expects a simple object with primitive values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.evaluate(flatContext as any);
    } catch (error) {
      // If expression parsing fails, try to return it as a literal
      // This handles cases like simple strings or JSON objects
      try {
        return JSON.parse(expression);
      } catch {
        throw error;
      }
    }
  }

  /**
   * Flatten nested context object for expression evaluation
   * e.g., { trigger: { body: { name: 'John' } } }
   * becomes { trigger_body_name: 'John', trigger: {...} }
   */
  private flattenContext(
    obj: Record<string, unknown>,
    prefix = '',
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;

      // Keep original nested structure accessible
      result[newKey] = value;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Also flatten nested objects
        Object.assign(
          result,
          this.flattenContext(value as Record<string, unknown>, newKey),
        );
      }
    }

    // Also keep top-level keys without prefix
    if (!prefix) {
      Object.assign(result, obj);
    }

    return result;
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
