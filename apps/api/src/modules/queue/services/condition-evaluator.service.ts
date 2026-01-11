import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext } from '../types';
import { TemplateResolverService } from './template-resolver.service';

/**
 * Service for evaluating condition expressions.
 * Supports basic comparisons and logical operators.
 * Uses safe evaluation without eval().
 */
@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  constructor(private readonly templateResolver: TemplateResolverService) {}

  /**
   * Evaluate a condition expression
   * @param expression - The condition expression (e.g., "{{trigger.status}} === 200")
   * @param context - The execution context with data from previous steps
   * @returns true if condition is met, false otherwise
   */
  evaluate(expression: string, context: ExecutionContext): boolean {
    try {
      // First resolve all templates in the expression
      const resolvedExpression = this.templateResolver.resolveString(
        expression,
        context,
      );

      this.logger.debug(
        `Evaluating condition: "${expression}" -> "${resolvedExpression}"`,
      );

      // Parse and evaluate the expression
      return this.evaluateExpression(resolvedExpression);
    } catch (error) {
      this.logger.error(`Failed to evaluate condition: ${expression}`, error);
      return false;
    }
  }

  /**
   * Evaluate a resolved expression (no templates, just values)
   */
  private evaluateExpression(expr: string): boolean {
    const trimmed = expr.trim();

    // Handle boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Handle logical operators (AND, OR)
    if (trimmed.includes('&&')) {
      const parts = trimmed.split('&&');
      return parts.every((part) => this.evaluateExpression(part));
    }

    if (trimmed.includes('||')) {
      const parts = trimmed.split('||');
      return parts.some((part) => this.evaluateExpression(part));
    }

    // Handle NOT operator
    if (trimmed.startsWith('!')) {
      return !this.evaluateExpression(trimmed.slice(1));
    }

    // Handle parentheses
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      return this.evaluateExpression(trimmed.slice(1, -1));
    }

    // Handle comparison operators
    return this.evaluateComparison(trimmed);
  }

  /**
   * Evaluate a simple comparison expression
   */
  private evaluateComparison(expr: string): boolean {
    // Operators in order of precedence (longer first)
    const operators = ['===', '!==', '>=', '<=', '==', '!=', '>', '<'];

    for (const op of operators) {
      const index = expr.indexOf(op);
      if (index !== -1) {
        const left = this.parseValue(expr.slice(0, index).trim());
        const right = this.parseValue(expr.slice(index + op.length).trim());

        switch (op) {
          case '===':
            return left === right;
          case '!==':
            return left !== right;
          case '==':
            return left == right;
          case '!=':
            return left != right;
          case '>':
            return Number(left) > Number(right);
          case '<':
            return Number(left) < Number(right);
          case '>=':
            return Number(left) >= Number(right);
          case '<=':
            return Number(left) <= Number(right);
        }
      }
    }

    // If no operator found, try to evaluate as truthy/falsy
    const value = this.parseValue(expr);
    return Boolean(value);
  }

  /**
   * Parse a value from string representation
   */
  private parseValue(str: string): unknown {
    const trimmed = str.trim();

    // Handle string literals (single or double quotes)
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    // Handle null/undefined
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // Handle boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Handle numbers
    const num = Number(trimmed);
    if (!isNaN(num)) return num;

    // Handle empty string (from unresolved templates)
    if (trimmed === '') return undefined;

    // Return as-is (string)
    return trimmed;
  }
}
