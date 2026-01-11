import { TemplateResolverService } from './template-resolver.service';

describe('TemplateResolverService', () => {
  let service: TemplateResolverService;

  beforeEach(() => {
    service = new TemplateResolverService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveString', () => {
    it('should return string without templates unchanged', () => {
      const context = { trigger: { data: 'test' } };
      const result = service.resolveString('Hello World', context);
      expect(result).toBe('Hello World');
    });

    it('should resolve simple template', () => {
      const context = { trigger: { name: 'John' } };
      const result = service.resolveString('Hello {{trigger.name}}!', context);
      expect(result).toBe('Hello John!');
    });

    it('should resolve multiple templates', () => {
      const context = {
        trigger: { firstName: 'John', lastName: 'Doe' },
      };
      const result = service.resolveString(
        '{{trigger.firstName}} {{trigger.lastName}}',
        context,
      );
      expect(result).toBe('John Doe');
    });

    it('should resolve nested paths', () => {
      const context = {
        trigger: {
          user: {
            profile: {
              email: 'john@example.com',
            },
          },
        },
      };
      const result = service.resolveString(
        'Email: {{trigger.user.profile.email}}',
        context,
      );
      expect(result).toBe('Email: john@example.com');
    });

    it('should resolve node output reference', () => {
      const context = {
        trigger: { data: 'initial' },
        'node-1': { result: 'processed' },
      };
      const result = service.resolveString(
        'Result: {{node-1.result}}',
        context,
      );
      expect(result).toBe('Result: processed');
    });

    it('should return empty string for undefined path', () => {
      const context = { trigger: {} };
      const result = service.resolveString(
        'Value: {{trigger.missing}}',
        context,
      );
      expect(result).toBe('Value: ');
    });

    it('should return empty string for null value', () => {
      const context = { trigger: { value: null } };
      const result = service.resolveString('Value: {{trigger.value}}', context);
      expect(result).toBe('Value: ');
    });

    it('should stringify object values', () => {
      const context = {
        trigger: {
          data: { key: 'value', num: 42 },
        },
      };
      const result = service.resolveString('Data: {{trigger.data}}', context);
      expect(result).toBe('Data: {"key":"value","num":42}');
    });

    it('should stringify array values', () => {
      const context = {
        trigger: { items: [1, 2, 3] },
      };
      const result = service.resolveString('Items: {{trigger.items}}', context);
      expect(result).toBe('Items: [1,2,3]');
    });

    it('should handle number values', () => {
      const context = {
        trigger: { count: 42 },
      };
      const result = service.resolveString('Count: {{trigger.count}}', context);
      expect(result).toBe('Count: 42');
    });

    it('should handle boolean values', () => {
      const context = {
        trigger: { active: true, disabled: false },
      };
      const result = service.resolveString(
        'Active: {{trigger.active}}, Disabled: {{trigger.disabled}}',
        context,
      );
      expect(result).toBe('Active: true, Disabled: false');
    });

    it('should handle template with whitespace', () => {
      const context = { trigger: { name: 'Test' } };
      const result = service.resolveString('{{  trigger.name  }}', context);
      expect(result).toBe('Test');
    });

    it('should handle deeply nested context access', () => {
      const context = {
        trigger: {
          body: {
            users: {
              admin: {
                permissions: {
                  read: true,
                },
              },
            },
          },
        },
      };
      const result = service.resolveString(
        '{{trigger.body.users.admin.permissions.read}}',
        context,
      );
      expect(result).toBe('true');
    });

    it('should handle partial path resolution', () => {
      const context = {
        trigger: { user: null },
      };
      const result = service.resolveString('{{trigger.user.name}}', context);
      expect(result).toBe('');
    });
  });

  describe('resolveObject', () => {
    it('should return null/undefined unchanged', () => {
      const context = { trigger: {} };
      expect(service.resolveObject(null, context)).toBeNull();
      expect(service.resolveObject(undefined, context)).toBeUndefined();
    });

    it('should resolve templates in string properties', () => {
      const context = { trigger: { name: 'Test' } };
      const obj = {
        label: '{{trigger.name}}',
        static: 'unchanged',
      };
      const result = service.resolveObject(obj, context);
      expect(result).toEqual({
        label: 'Test',
        static: 'unchanged',
      });
    });

    it('should resolve templates in nested objects', () => {
      const context = {
        trigger: { email: 'test@example.com', subject: 'Hello' },
      };
      const obj = {
        email: {
          to: '{{trigger.email}}',
          subject: '{{trigger.subject}}',
        },
      };
      const result = service.resolveObject(obj, context);
      expect(result).toEqual({
        email: {
          to: 'test@example.com',
          subject: 'Hello',
        },
      });
    });

    it('should resolve templates in arrays', () => {
      const context = {
        trigger: { item1: 'A', item2: 'B' },
      };
      const arr = ['{{trigger.item1}}', '{{trigger.item2}}', 'static'];
      const result = service.resolveObject(arr, context);
      expect(result).toEqual(['A', 'B', 'static']);
    });

    it('should handle mixed array of objects', () => {
      const context = { trigger: { value: 'resolved' } };
      const arr = [{ key: '{{trigger.value}}' }, { key: 'static' }];
      const result = service.resolveObject(arr, context);
      expect(result).toEqual([{ key: 'resolved' }, { key: 'static' }]);
    });

    it('should preserve non-string primitives', () => {
      const context = { trigger: {} };
      const obj = {
        num: 42,
        bool: true,
        nul: null,
      };
      const result = service.resolveObject(obj, context);
      expect(result).toEqual({
        num: 42,
        bool: true,
        nul: null,
      });
    });

    it('should handle complex nested structure', () => {
      const context = {
        trigger: { url: 'https://api.example.com', token: 'secret123' },
      };
      const obj = {
        request: {
          url: '{{trigger.url}}/endpoint',
          headers: {
            authorization: 'Bearer {{trigger.token}}',
          },
          options: {
            retry: true,
            timeout: 5000,
          },
        },
      };
      const result = service.resolveObject(obj, context);
      expect(result).toEqual({
        request: {
          url: 'https://api.example.com/endpoint',
          headers: {
            authorization: 'Bearer secret123',
          },
          options: {
            retry: true,
            timeout: 5000,
          },
        },
      });
    });
  });

  describe('hasTemplates', () => {
    it('should return true for string with templates', () => {
      expect(service.hasTemplates('{{trigger.value}}')).toBe(true);
    });

    it('should return true for string with multiple templates', () => {
      expect(service.hasTemplates('{{a}} and {{b}}')).toBe(true);
    });

    it('should return false for string without templates', () => {
      expect(service.hasTemplates('plain text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.hasTemplates('')).toBe(false);
    });

    it('should return false for malformed template', () => {
      expect(service.hasTemplates('{{unclosed')).toBe(false);
      expect(service.hasTemplates('unopened}}')).toBe(false);
    });
  });

  describe('extractTemplatePaths', () => {
    it('should extract single path', () => {
      const paths = service.extractTemplatePaths('{{trigger.value}}');
      expect(paths).toEqual(['trigger.value']);
    });

    it('should extract multiple paths', () => {
      const paths = service.extractTemplatePaths(
        '{{trigger.a}} and {{node-1.b}}',
      );
      expect(paths).toEqual(['trigger.a', 'node-1.b']);
    });

    it('should return empty array for no templates', () => {
      const paths = service.extractTemplatePaths('plain text');
      expect(paths).toEqual([]);
    });

    it('should trim whitespace from paths', () => {
      const paths = service.extractTemplatePaths('{{  trigger.value  }}');
      expect(paths).toEqual(['trigger.value']);
    });
  });
});
