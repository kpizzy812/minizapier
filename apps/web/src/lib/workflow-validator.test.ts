import { describe, it, expect } from 'vitest';
import {
  validateWorkflow,
  formatValidationErrors,
  ValidationResult,
} from './workflow-validator';

// Helper types for cleaner test data
interface TestNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface TestEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

// Helper function to create nodes
function createNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {}
): TestNode {
  return { id, type, data: { label: id, ...data } };
}

// Helper function to create edges
function createEdge(
  source: string,
  target: string,
  sourceHandle?: string | null
): TestEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle,
  };
}

describe('validateWorkflow', () => {
  describe('Empty workflow', () => {
    it('should return error for empty workflow', () => {
      const result = validateWorkflow([], []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe(
        'Workflow is empty. Add at least one node.'
      );
    });
  });

  describe('Trigger validation', () => {
    it('should return error when no trigger node exists', () => {
      const nodes: TestNode[] = [createNode('action1', 'httpRequest')];
      const edges: TestEdge[] = [];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('trigger'))).toBe(
        true
      );
    });

    it('should accept webhookTrigger as valid trigger', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.errors.some((e) => e.message.includes('trigger node'))
      ).toBe(false);
    });

    it('should accept scheduleTrigger as valid trigger', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'scheduleTrigger', { cron: '* * * * *' }),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.errors.some((e) => e.message.includes('trigger node'))
      ).toBe(false);
    });

    it('should accept emailTrigger as valid trigger', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'emailTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.errors.some((e) => e.message.includes('trigger node'))
      ).toBe(false);
    });

    it('should warn about multiple triggers', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('trigger2', 'scheduleTrigger', { cron: '* * * * *' }),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'action1'),
        createEdge('trigger2', 'action1'),
      ];

      const result = validateWorkflow(nodes, edges);

      expect(result.warnings.some((w) => w.message.includes('Multiple'))).toBe(
        true
      );
    });

    it('should error when trigger has no outgoing connections', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = []; // No edges

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('no outgoing'))
      ).toBe(true);
    });
  });

  describe('Disconnected nodes', () => {
    it('should warn about disconnected non-trigger nodes', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        createNode('action2', 'sendEmail', {
          to: 'test@example.com',
          subject: 'Test',
        }),
      ];
      const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.warnings.some((w) => w.message.includes('not connected'))
      ).toBe(true);
      expect(result.warnings.some((w) => w.nodeId === 'action2')).toBe(true);
    });

    it('should not warn about disconnected trigger (triggers can be standalone)', () => {
      const nodes: TestNode[] = [createNode('trigger1', 'webhookTrigger')];
      const edges: TestEdge[] = [];

      const result = validateWorkflow(nodes, edges);

      // Should not warn about the trigger being disconnected
      // But should error about no outgoing connection
      expect(
        result.warnings.some((w) => w.message.includes('not connected'))
      ).toBe(false);
    });
  });

  describe('Condition node validation', () => {
    it('should error when condition has no outputs', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('condition1', 'condition', { expression: 'x > 5' }),
      ];
      const edges: TestEdge[] = [createEdge('trigger1', 'condition1')];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('no outputs connected'))
      ).toBe(true);
    });

    it('should warn when condition is missing true branch', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('condition1', 'condition', { expression: 'x > 5' }),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'condition1'),
        createEdge('condition1', 'action1', 'false'),
      ];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.warnings.some((w) => w.message.includes('missing "true"'))
      ).toBe(true);
    });

    it('should warn when condition is missing false branch', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('condition1', 'condition', { expression: 'x > 5' }),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'condition1'),
        createEdge('condition1', 'action1', 'true'),
      ];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.warnings.some((w) => w.message.includes('missing "false"'))
      ).toBe(true);
    });

    it('should not warn when condition has both branches', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('condition1', 'condition', { expression: 'x > 5' }),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        createNode('action2', 'httpRequest', { url: 'https://example2.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'condition1'),
        createEdge('condition1', 'action1', 'true'),
        createEdge('condition1', 'action2', 'false'),
      ];

      const result = validateWorkflow(nodes, edges);

      expect(
        result.warnings.some((w) => w.message.includes('branch'))
      ).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('outputs connected'))
      ).toBe(false);
    });
  });

  describe('Cycle detection', () => {
    it('should detect simple cycle (A -> B -> A)', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        createNode('action2', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'action1'),
        createEdge('action1', 'action2'),
        createEdge('action2', 'action1'), // Creates cycle
      ];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('cycle'))).toBe(true);
    });

    it('should detect complex cycle (A -> B -> C -> A)', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        createNode('action2', 'httpRequest', { url: 'https://example.com' }),
        createNode('action3', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'action1'),
        createEdge('action1', 'action2'),
        createEdge('action2', 'action3'),
        createEdge('action3', 'action1'), // Creates cycle
      ];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('cycle'))).toBe(true);
    });

    it('should detect self-loop', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'action1'),
        createEdge('action1', 'action1'), // Self-loop
      ];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('cycle'))).toBe(true);
    });

    it('should allow acyclic graph', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        createNode('action2', 'httpRequest', { url: 'https://example.com' }),
        createNode('action3', 'httpRequest', { url: 'https://example.com' }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'action1'),
        createEdge('action1', 'action2'),
        createEdge('action1', 'action3'),
        createEdge('action2', 'action3'),
      ];

      const result = validateWorkflow(nodes, edges);

      expect(result.errors.some((e) => e.message.includes('cycle'))).toBe(
        false
      );
    });
  });

  describe('Required fields validation', () => {
    describe('HTTP Request', () => {
      it('should error when URL is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'httpRequest', {}),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing URL'))
        ).toBe(true);
      });

      it('should error when URL is empty string', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'httpRequest', { url: '   ' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing URL'))
        ).toBe(true);
      });

      it('should pass when URL is provided', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(
          result.errors.some((e) => e.message.includes('missing URL'))
        ).toBe(false);
      });
    });

    describe('Send Email', () => {
      it('should error when recipient is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'sendEmail', { subject: 'Test' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing recipient'))
        ).toBe(true);
      });

      it('should error when subject is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'sendEmail', { to: 'test@example.com' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing subject'))
        ).toBe(true);
      });

      it('should pass when all fields provided', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'sendEmail', {
            to: 'test@example.com',
            subject: 'Test Subject',
          }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(
          result.errors.some((e) => e.message.includes('Send Email'))
        ).toBe(false);
      });
    });

    describe('Send Telegram', () => {
      it('should error when chat ID is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'sendTelegram', { message: 'Hello' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing chat ID'))
        ).toBe(true);
      });

      it('should error when message is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'sendTelegram', { chatId: '123456' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing message'))
        ).toBe(true);
      });

      it('should pass when all fields provided', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'sendTelegram', {
            chatId: '123456',
            message: 'Hello',
          }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(
          result.errors.some((e) => e.message.includes('Send Telegram'))
        ).toBe(false);
      });
    });

    describe('Database Query', () => {
      it('should error when SQL query is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'databaseQuery', {}),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing SQL query'))
        ).toBe(true);
      });

      it('should pass when query is provided', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('action1', 'databaseQuery', { query: 'SELECT * FROM users' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(
          result.errors.some((e) => e.message.includes('missing SQL query'))
        ).toBe(false);
      });
    });

    describe('Condition', () => {
      it('should error when expression is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('condition1', 'condition', {}),
          createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        ];
        const edges: TestEdge[] = [
          createEdge('trigger1', 'condition1'),
          createEdge('condition1', 'action1', 'true'),
          createEdge('condition1', 'action1', 'false'),
        ];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing expression'))
        ).toBe(true);
      });

      it('should pass when expression is provided', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'webhookTrigger'),
          createNode('condition1', 'condition', { expression: 'x > 5' }),
          createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        ];
        const edges: TestEdge[] = [
          createEdge('trigger1', 'condition1'),
          createEdge('condition1', 'action1', 'true'),
          createEdge('condition1', 'action1', 'false'),
        ];

        const result = validateWorkflow(nodes, edges);

        expect(
          result.errors.some((e) => e.message.includes('missing expression'))
        ).toBe(false);
      });
    });

    describe('Schedule Trigger', () => {
      it('should error when cron expression is missing', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'scheduleTrigger', {}),
          createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.message.includes('missing cron'))
        ).toBe(true);
      });

      it('should pass when cron expression is provided', () => {
        const nodes: TestNode[] = [
          createNode('trigger1', 'scheduleTrigger', { cron: '0 * * * *' }),
          createNode('action1', 'httpRequest', { url: 'https://example.com' }),
        ];
        const edges: TestEdge[] = [createEdge('trigger1', 'action1')];

        const result = validateWorkflow(nodes, edges);

        expect(
          result.errors.some((e) => e.message.includes('missing cron'))
        ).toBe(false);
      });
    });
  });

  describe('Complex workflow scenarios', () => {
    it('should validate a complete valid workflow', () => {
      const nodes: TestNode[] = [
        createNode('trigger1', 'webhookTrigger'),
        createNode('condition1', 'condition', { expression: 'data.type === "email"' }),
        createNode('email1', 'sendEmail', {
          to: 'admin@example.com',
          subject: 'New Submission',
        }),
        createNode('telegram1', 'sendTelegram', {
          chatId: '123456',
          message: 'New submission received',
        }),
      ];
      const edges: TestEdge[] = [
        createEdge('trigger1', 'condition1'),
        createEdge('condition1', 'email1', 'true'),
        createEdge('condition1', 'telegram1', 'false'),
      ];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple errors for workflow with multiple issues', () => {
      const nodes: TestNode[] = [
        createNode('action1', 'httpRequest', {}), // No trigger, no URL
        createNode('action2', 'sendEmail', {}), // Disconnected, missing fields
      ];
      const edges: TestEdge[] = [];

      const result = validateWorkflow(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('formatValidationErrors', () => {
  it('should format errors and warnings into string', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [
        { type: 'error', message: 'Error 1' },
        { type: 'error', message: 'Error 2' },
      ],
      warnings: [{ type: 'warning', message: 'Warning 1' }],
    };

    const formatted = formatValidationErrors(result);

    expect(formatted).toContain('Error: Error 1');
    expect(formatted).toContain('Error: Error 2');
    expect(formatted).toContain('Warning: Warning 1');
  });

  it('should return empty string for valid workflow', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const formatted = formatValidationErrors(result);

    expect(formatted).toBe('');
  });
});
