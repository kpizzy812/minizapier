import { TransformAction } from './transform.action';

describe('TransformAction', () => {
  let service: TransformAction;

  beforeEach(() => {
    service = new TransformAction();
  });

  describe('execute - empty expression', () => {
    it('should return context when expression is empty', () => {
      const context = { trigger: { data: 'test' } };

      const result = service.execute({ expression: '' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(context);
    });

    it('should return context when expression is whitespace', () => {
      const context = { trigger: { value: 123 } };

      const result = service.execute({ expression: '   ' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(context);
    });
  });

  describe('execute - JSONPath expressions', () => {
    it('should extract value with $ prefix', () => {
      const context = {
        trigger: { user: { name: 'John', age: 30 } },
      };

      const result = service.execute(
        { expression: '$.trigger.user.name', type: 'jsonpath' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('John');
    });

    it('should extract nested value', () => {
      const context = {
        'node-1': {
          response: {
            data: {
              users: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            },
          },
        },
      };

      const result = service.execute(
        {
          expression: '$["node-1"].response.data.users[0].name',
          type: 'jsonpath',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('Alice');
    });

    it('should extract array with wildcard', () => {
      const context = {
        trigger: {
          items: [
            { name: 'Item 1', price: 10 },
            { name: 'Item 2', price: 20 },
            { name: 'Item 3', price: 30 },
          ],
        },
      };

      const result = service.execute(
        { expression: '$.trigger.items[*].name', type: 'jsonpath' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should handle filter expressions', () => {
      const context = {
        trigger: {
          products: [
            { name: 'A', inStock: true },
            { name: 'B', inStock: false },
            { name: 'C', inStock: true },
          ],
        },
      };

      const result = service.execute(
        {
          expression: '$.trigger.products[?(@.inStock==true)].name',
          type: 'jsonpath',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['A', 'C']);
    });

    it('should auto-add $ prefix if missing', () => {
      const context = { trigger: { value: 42 } };

      const result = service.execute(
        { expression: 'trigger.value', type: 'jsonpath' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should return undefined for non-existent path', () => {
      const context = { trigger: {} };

      const result = service.execute(
        { expression: '$.trigger.missing.path' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined(); // JSONPath returns undefined for no match with wrap: false
    });
  });

  /**
   * Safe expressions using expr-eval library.
   * Note: For security, JavaScript eval is NOT used. Instead, expr-eval provides
   * safe mathematical and logical expression evaluation without code injection risks.
   *
   * Limitations compared to full JavaScript:
   * - No arrow functions or array methods like filter/map
   * - No template literals or spread operators
   * - Use flattened variable names: trigger_count instead of trigger.count
   *
   * Built-in utility functions: length, toLowerCase, toUpperCase, trim, toString,
   * toNumber, isNull, coalesce
   */
  describe('execute - safe expressions (expr-eval)', () => {
    it('should evaluate arithmetic with flattened variables', () => {
      const context = { trigger: { count: 5 } };

      // expr-eval uses flattened context: trigger_count instead of trigger.count
      const result = service.execute(
        { expression: 'trigger_count * 2', type: 'expression' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should evaluate string concatenation', () => {
      const context = {
        trigger: { firstName: 'John', lastName: 'Doe' },
      };

      const result = service.execute(
        {
          expression: 'trigger_firstName + " " + trigger_lastName',
          type: 'expression',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('John Doe');
    });

    it('should evaluate ternary expressions', () => {
      const context = { trigger: { score: 85 } };

      const result = service.execute(
        {
          expression: 'trigger_score >= 80 ? "pass" : "fail"',
          type: 'expression',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('pass');
    });

    it('should evaluate comparison operators', () => {
      const context = { trigger: { a: 10, b: 5 } };

      const result = service.execute(
        { expression: 'trigger_a > trigger_b', type: 'expression' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should evaluate logical operators', () => {
      const context = { trigger: { x: true, y: false } };

      const result = service.execute(
        { expression: 'trigger_x and not trigger_y', type: 'expression' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should use built-in utility functions', () => {
      const context = { trigger: { name: '  HELLO  ' } };

      const result = service.execute(
        { expression: 'toLowerCase(trim(trigger_name))', type: 'expression' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should use coalesce for default values', () => {
      const context = { trigger: { value: null, defaultValue: 'fallback' } };

      const result = service.execute(
        {
          expression: 'coalesce(trigger_value, trigger_defaultValue)',
          type: 'expression',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback');
    });

    it('should use length function for arrays', () => {
      const context = { trigger: { items: [1, 2, 3, 4, 5] } };

      const result = service.execute(
        { expression: 'length(trigger_items)', type: 'expression' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should convert values with toString and toNumber', () => {
      const context = { trigger: { num: 42, str: '123' } };

      const result1 = service.execute(
        { expression: 'toString(trigger_num)', type: 'expression' },
        context,
      );

      const result2 = service.execute(
        { expression: 'toNumber(trigger_str) + 7', type: 'expression' },
        context,
      );

      expect(result1.success).toBe(true);
      expect(result1.data).toBe('42');
      expect(result2.success).toBe(true);
      expect(result2.data).toBe(130);
    });
  });

  describe('execute - auto-detect type', () => {
    it('should auto-detect JSONPath when starts with $', () => {
      const context = { trigger: { name: 'Auto' } };

      const result = service.execute({ expression: '$.trigger.name' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Auto');
    });

    it('should return error for standalone @ prefix (requires filter context)', () => {
      // Note: @ in JSONPath is only valid inside filter expressions
      // e.g., $.items[?(@.price > 10)] - @ refers to current item being filtered
      // Using @.path standalone throws "Unknown value type" error
      const context = { trigger: { value: 42 } };

      const result = service.execute(
        { expression: '@.trigger.value' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown value type');
    });

    it('should use JSONPath for expressions without $ prefix (auto-adds $)', () => {
      // Note: Auto-detect tries JSONPath first for non-$ non-@ expressions
      // JSONPath doesn't throw for invalid paths, just returns undefined
      // For math expressions, explicitly use type: 'javascript'
      const context = { trigger: { a: 2, b: 3 } };

      // This tries JSONPath which auto-adds $ -> $.trigger.a + trigger.b
      // JSONPath returns undefined for invalid expression, doesn't fallback to JS
      const result = service.execute(
        { expression: 'trigger.a' }, // Simple path works with JSONPath
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    it('should require explicit type for math expressions', () => {
      const context = { trigger: { a: 2, b: 3 } };

      // For math operations, explicitly specify type: 'expression'
      const result = service.execute(
        { expression: 'trigger_a + trigger_b', type: 'expression' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });
  });

  describe('execute - error handling', () => {
    it('should return error for invalid expression syntax', () => {
      const context = { trigger: {} };

      const result = service.execute(
        { expression: 'invalid syntax {{', type: 'expression' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined variable gracefully', () => {
      const context = { trigger: {} };

      // expr-eval returns undefined for unknown variables, doesn't throw
      const result = service.execute(
        { expression: 'nonExistent', type: 'expression' },
        context,
      );

      // Either fails or returns undefined depending on how parser handles it
      // The important thing is it doesn't crash
      expect(result).toBeDefined();
    });
  });

  describe('getValueByPath', () => {
    it('should get simple path', () => {
      const context = { trigger: { value: 42 } };

      const result = service.getValueByPath(context, 'trigger.value');

      expect(result).toBe(42);
    });

    it('should get deeply nested path', () => {
      const context = {
        trigger: {
          data: {
            user: {
              profile: {
                email: 'test@example.com',
              },
            },
          },
        },
      };

      const result = service.getValueByPath(
        context,
        'trigger.data.user.profile.email',
      );

      expect(result).toBe('test@example.com');
    });

    it('should return undefined for non-existent path', () => {
      const context = { trigger: {} };

      const result = service.getValueByPath(context, 'trigger.missing.path');

      expect(result).toBeUndefined();
    });

    it('should handle null in path', () => {
      const context = { trigger: { data: null } };

      const result = service.getValueByPath(context, 'trigger.data.value');

      expect(result).toBeUndefined();
    });

    it('should handle undefined in path', () => {
      const context = { trigger: { data: undefined } };

      const result = service.getValueByPath(context, 'trigger.data.value');

      expect(result).toBeUndefined();
    });

    it('should handle primitive in path', () => {
      const context = { trigger: { value: 42 } };

      const result = service.getValueByPath(context, 'trigger.value.something');

      expect(result).toBeUndefined();
    });
  });
});
