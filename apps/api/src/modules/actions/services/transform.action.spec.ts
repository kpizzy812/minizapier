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

  describe('execute - JavaScript expressions', () => {
    it('should evaluate simple property access', () => {
      const context = { trigger: { count: 5 } };

      const result = service.execute(
        { expression: 'trigger.count * 2', type: 'javascript' },
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
          expression: 'trigger.firstName + " " + trigger.lastName',
          type: 'javascript',
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
          expression: 'trigger.score >= 80 ? "pass" : "fail"',
          type: 'javascript',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('pass');
    });

    it('should evaluate array operations', () => {
      const context = {
        trigger: { numbers: [1, 2, 3, 4, 5] },
      };

      const result = service.execute(
        {
          expression: 'trigger.numbers.filter(n => n > 2)',
          type: 'javascript',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([3, 4, 5]);
    });

    it('should evaluate object spread', () => {
      const context = {
        trigger: { name: 'Test', value: 1 },
      };

      const result = service.execute(
        { expression: '{ ...trigger, extra: "added" }', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'Test', value: 1, extra: 'added' });
    });

    it('should evaluate template literals', () => {
      const context = {
        trigger: { name: 'World' },
      };

      const result = service.execute(
        { expression: '`Hello, ${trigger.name}!`', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('Hello, World!');
    });

    it('should access node output', () => {
      // Note: Context keys must be valid JS identifiers when using JavaScript type
      // Keys like 'http-1' with hyphens won't work as they can't be function parameters
      const context = {
        trigger: { id: 1 },
        httpNode: { status: 200, body: { result: 'success' } },
      };

      const result = service.execute(
        { expression: 'httpNode.body.result', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
    });

    it('should evaluate Math operations', () => {
      const context = { trigger: { value: -5 } };

      const result = service.execute(
        { expression: 'Math.abs(trigger.value)', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should handle object literal creation', () => {
      const context = {
        trigger: { a: 1, b: 2 },
      };

      const result = service.execute(
        {
          expression:
            '{ sum: trigger.a + trigger.b, product: trigger.a * trigger.b }',
          type: 'javascript',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sum: 3, product: 2 });
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

    it('should require explicit type for JavaScript math expressions', () => {
      const context = { trigger: { a: 2, b: 3 } };

      // For math operations, explicitly specify type: 'javascript'
      const result = service.execute(
        { expression: 'trigger.a + trigger.b', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });
  });

  describe('execute - error handling', () => {
    it('should return error for invalid JavaScript', () => {
      const context = { trigger: {} };

      const result = service.execute(
        { expression: 'invalid syntax {{', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for undefined variable access', () => {
      const context = { trigger: {} };

      const result = service.execute(
        { expression: 'nonExistent.property', type: 'javascript' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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
