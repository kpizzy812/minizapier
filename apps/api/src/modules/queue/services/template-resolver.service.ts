import { Injectable } from '@nestjs/common';
import { ExecutionContext } from '../types';

/**
 * Service for resolving template variables in node configurations.
 * Supports syntax: {{nodeId.path.to.value}} or {{trigger.body.field}}
 */
@Injectable()
export class TemplateResolverService {
  private readonly TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

  /**
   * Resolve all templates in a string
   */
  resolveString(template: string, context: ExecutionContext): string {
    return template.replace(
      this.TEMPLATE_REGEX,
      (_match: string, path: string) => {
        const value = this.getValueByPath(context, path.trim());
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        // Safe string conversion for primitives
        return typeof value === 'string' ? value : JSON.stringify(value);
      },
    );
  }

  /**
   * Resolve templates in an object (recursively)
   */
  resolveObject<T>(obj: T, context: ExecutionContext): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.resolveString(obj, context) as T;
    }

    if (Array.isArray(obj)) {
      const resolved = obj.map((item: unknown) =>
        this.resolveObject(item, context),
      );
      return resolved as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as object)) {
        result[key] = this.resolveObject(value, context);
      }
      return result as T;
    }

    return obj;
  }

  /**
   * Get value by dot-notation path from context
   * Example: "trigger.body.user.id" -> context.trigger.body.user.id
   */
  private getValueByPath(context: ExecutionContext, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Check if string contains templates
   */
  hasTemplates(str: string): boolean {
    return this.TEMPLATE_REGEX.test(str);
  }

  /**
   * Extract all template paths from a string
   */
  extractTemplatePaths(str: string): string[] {
    const paths: string[] = [];
    let match;
    const regex = new RegExp(this.TEMPLATE_REGEX);
    while ((match = regex.exec(str)) !== null) {
      paths.push(match[1].trim());
    }
    return paths;
  }
}
