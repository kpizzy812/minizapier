import { ConditionEvaluatorService } from './condition-evaluator.service';
import { TemplateResolverService } from './template-resolver.service';

describe('ConditionEvaluatorService', () => {
  let service: ConditionEvaluatorService;
  let templateResolver: TemplateResolverService;

  beforeEach(() => {
    templateResolver = new TemplateResolverService();
    service = new ConditionEvaluatorService(templateResolver);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluate - basic comparisons', () => {
    it('should evaluate strict equality (===)', () => {
      const context = { trigger: { status: 200 } };
      expect(service.evaluate('{{trigger.status}} === 200', context)).toBe(
        true,
      );
      expect(service.evaluate('{{trigger.status}} === 404', context)).toBe(
        false,
      );
    });

    it('should evaluate strict inequality (!==)', () => {
      const context = { trigger: { status: 200 } };
      expect(service.evaluate('{{trigger.status}} !== 404', context)).toBe(
        true,
      );
      expect(service.evaluate('{{trigger.status}} !== 200', context)).toBe(
        false,
      );
    });

    it('should evaluate loose equality (==)', () => {
      const context = { trigger: { value: '100' } };
      expect(service.evaluate('{{trigger.value}} == 100', context)).toBe(true);
    });

    it('should evaluate loose inequality (!=)', () => {
      const context = { trigger: { value: '100' } };
      expect(service.evaluate('{{trigger.value}} != 200', context)).toBe(true);
    });

    it('should evaluate greater than (>)', () => {
      const context = { trigger: { count: 50 } };
      expect(service.evaluate('{{trigger.count}} > 25', context)).toBe(true);
      expect(service.evaluate('{{trigger.count}} > 50', context)).toBe(false);
      expect(service.evaluate('{{trigger.count}} > 100', context)).toBe(false);
    });

    it('should evaluate less than (<)', () => {
      const context = { trigger: { count: 50 } };
      expect(service.evaluate('{{trigger.count}} < 100', context)).toBe(true);
      expect(service.evaluate('{{trigger.count}} < 50', context)).toBe(false);
      expect(service.evaluate('{{trigger.count}} < 25', context)).toBe(false);
    });

    it('should evaluate greater than or equal (>=)', () => {
      const context = { trigger: { count: 50 } };
      expect(service.evaluate('{{trigger.count}} >= 50', context)).toBe(true);
      expect(service.evaluate('{{trigger.count}} >= 25', context)).toBe(true);
      expect(service.evaluate('{{trigger.count}} >= 100', context)).toBe(false);
    });

    it('should evaluate less than or equal (<=)', () => {
      const context = { trigger: { count: 50 } };
      expect(service.evaluate('{{trigger.count}} <= 50', context)).toBe(true);
      expect(service.evaluate('{{trigger.count}} <= 100', context)).toBe(true);
      expect(service.evaluate('{{trigger.count}} <= 25', context)).toBe(false);
    });
  });

  describe('evaluate - string comparisons', () => {
    it('should compare string values with quotes', () => {
      const context = { trigger: { type: 'success' } };
      expect(service.evaluate("{{trigger.type}} === 'success'", context)).toBe(
        true,
      );
      expect(service.evaluate('{{trigger.type}} === "success"', context)).toBe(
        true,
      );
    });

    it('should compare string values case-sensitive', () => {
      const context = { trigger: { name: 'Test' } };
      expect(service.evaluate("{{trigger.name}} === 'Test'", context)).toBe(
        true,
      );
      expect(service.evaluate("{{trigger.name}} === 'test'", context)).toBe(
        false,
      );
    });
  });

  describe('evaluate - boolean literals', () => {
    it('should evaluate true literal', () => {
      const context = { trigger: {} };
      expect(service.evaluate('true', context)).toBe(true);
    });

    it('should evaluate false literal', () => {
      const context = { trigger: {} };
      expect(service.evaluate('false', context)).toBe(false);
    });

    it('should compare with boolean values', () => {
      const context = { trigger: { active: true } };
      expect(service.evaluate('{{trigger.active}} === true', context)).toBe(
        true,
      );
      expect(service.evaluate('{{trigger.active}} === false', context)).toBe(
        false,
      );
    });
  });

  describe('evaluate - null/undefined comparisons', () => {
    // Note: Template resolver converts null/undefined to empty string
    // So null/undefined comparisons work via empty string checks
    it('should treat null value as empty string (falsy)', () => {
      const context = { trigger: { value: null } };
      // null is converted to empty string by template resolver
      // empty string is falsy
      expect(service.evaluate('{{trigger.value}}', context)).toBe(false);
    });

    it('should treat missing values as empty string (falsy)', () => {
      const context = { trigger: {} };
      // missing value is converted to empty string
      expect(service.evaluate('{{trigger.missing}}', context)).toBe(false);
    });

    it('should detect empty values via inequality check', () => {
      const context = { trigger: { value: 'hello' } };
      // Check that existing value is not empty
      expect(service.evaluate("{{trigger.value}} !== ''", context)).toBe(true);
      // Check that it works with explicit quotes
      expect(service.evaluate("{{trigger.value}} === 'hello'", context)).toBe(
        true,
      );
    });
  });

  describe('evaluate - logical operators', () => {
    it('should evaluate AND operator (&&)', () => {
      const context = { trigger: { a: 10, b: 20 } };
      expect(
        service.evaluate('{{trigger.a}} > 5 && {{trigger.b}} > 15', context),
      ).toBe(true);
      expect(
        service.evaluate('{{trigger.a}} > 5 && {{trigger.b}} > 25', context),
      ).toBe(false);
      expect(
        service.evaluate('{{trigger.a}} > 15 && {{trigger.b}} > 15', context),
      ).toBe(false);
    });

    it('should evaluate OR operator (||)', () => {
      const context = { trigger: { a: 10, b: 20 } };
      expect(
        service.evaluate('{{trigger.a}} > 15 || {{trigger.b}} > 15', context),
      ).toBe(true);
      expect(
        service.evaluate('{{trigger.a}} > 5 || {{trigger.b}} > 25', context),
      ).toBe(true);
      expect(
        service.evaluate('{{trigger.a}} > 15 || {{trigger.b}} > 25', context),
      ).toBe(false);
    });

    it('should evaluate NOT operator (!)', () => {
      const context = { trigger: { value: false } };
      expect(service.evaluate('!{{trigger.value}}', context)).toBe(true);
    });

    it('should handle complex logical expressions', () => {
      const context = { trigger: { status: 200, type: 'api' } };
      expect(
        service.evaluate(
          "{{trigger.status}} === 200 && {{trigger.type}} === 'api'",
          context,
        ),
      ).toBe(true);
    });
  });

  describe('evaluate - parentheses', () => {
    it('should evaluate expression in parentheses', () => {
      const context = { trigger: { value: 10 } };
      expect(service.evaluate('({{trigger.value}} > 5)', context)).toBe(true);
    });

    it('should handle nested parentheses', () => {
      const context = { trigger: { a: 10 } };
      expect(service.evaluate('(({{trigger.a}} > 5))', context)).toBe(true);
    });
  });

  describe('evaluate - truthy/falsy values', () => {
    it('should evaluate non-zero number as truthy', () => {
      const context = { trigger: { count: 42 } };
      expect(service.evaluate('{{trigger.count}}', context)).toBe(true);
    });

    it('should evaluate zero as falsy', () => {
      const context = { trigger: { count: 0 } };
      expect(service.evaluate('{{trigger.count}}', context)).toBe(false);
    });

    it('should evaluate non-empty string as truthy', () => {
      const context = { trigger: { text: 'hello' } };
      expect(service.evaluate('{{trigger.text}}', context)).toBe(true);
    });

    it('should evaluate empty string as falsy', () => {
      const context = { trigger: { text: '' } };
      expect(service.evaluate('{{trigger.text}}', context)).toBe(false);
    });
  });

  describe('evaluate - error handling', () => {
    it('should return false for invalid expressions', () => {
      const context = { trigger: {} };
      // Template resolution should handle missing values gracefully
      expect(service.evaluate('{{trigger.missing.deep.path}}', context)).toBe(
        false,
      );
    });

    it('should return false for empty expression', () => {
      const context = { trigger: {} };
      expect(service.evaluate('', context)).toBe(false);
    });
  });

  describe('evaluate - node references', () => {
    it('should evaluate conditions using previous node outputs', () => {
      const context = {
        trigger: { data: 'initial' },
        'node-1': { status: 'success', count: 5 },
      };
      expect(service.evaluate("{{node-1.status}} === 'success'", context)).toBe(
        true,
      );
      expect(service.evaluate('{{node-1.count}} >= 5', context)).toBe(true);
    });

    it('should compare values from different nodes', () => {
      const context = {
        trigger: {},
        'node-1': { value: 10 },
        'node-2': { value: 10 },
      };
      expect(
        service.evaluate('{{node-1.value}} === {{node-2.value}}', context),
      ).toBe(true);
    });
  });

  describe('evaluate - edge cases', () => {
    it('should handle whitespace in expression', () => {
      const context = { trigger: { status: 200 } };
      expect(
        service.evaluate('  {{trigger.status}}   ===   200  ', context),
      ).toBe(true);
    });

    it('should handle expression with only template', () => {
      const context = { trigger: { active: true } };
      expect(service.evaluate('{{trigger.active}}', context)).toBe(true);
    });

    it('should handle numeric string comparison', () => {
      const context = { trigger: { code: '404' } };
      expect(service.evaluate('{{trigger.code}} == 404', context)).toBe(true);
    });
  });
});
