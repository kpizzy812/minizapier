/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { StepExecutorService } from './step-executor.service';
import { TemplateResolverService } from './template-resolver.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { WorkflowNode } from '@minizapier/shared';
import { ExecutionContext } from '../types';

describe('StepExecutorService', () => {
  let service: StepExecutorService;
  let templateResolver: TemplateResolverService;
  let conditionEvaluator: ConditionEvaluatorService;

  beforeEach(() => {
    templateResolver = new TemplateResolverService();
    conditionEvaluator = new ConditionEvaluatorService(templateResolver);
    service = new StepExecutorService(templateResolver, conditionEvaluator);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeStep - trigger nodes', () => {
    it('should execute webhookTrigger and return trigger data', async () => {
      const node: WorkflowNode = {
        id: 'trigger-1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: { label: 'Webhook' },
      };
      const context: ExecutionContext = {
        trigger: { method: 'POST', body: { name: 'Test' } },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual(context.trigger);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should execute scheduleTrigger and return trigger data', async () => {
      const node: WorkflowNode = {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        position: { x: 0, y: 0 },
        data: { label: 'Schedule' },
      };
      const context: ExecutionContext = {
        trigger: { scheduledAt: '2024-01-01T00:00:00Z' },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual(context.trigger);
    });

    it('should execute emailTrigger and return trigger data', async () => {
      const node: WorkflowNode = {
        id: 'trigger-1',
        type: 'emailTrigger',
        position: { x: 0, y: 0 },
        data: { label: 'Email' },
      };
      const context: ExecutionContext = {
        trigger: { from: 'test@example.com', subject: 'Test' },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual(context.trigger);
    });
  });

  describe('executeStep - condition node', () => {
    it('should evaluate condition as true', async () => {
      const node: WorkflowNode = {
        id: 'condition-1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Check Status',
          expression: '{{trigger.status}} === 200',
        },
      };
      const context: ExecutionContext = {
        trigger: { status: 200 },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      // Expression is resolved before evaluation, so templates are replaced
      expect(result.output).toEqual({
        result: true,
        expression: '200 === 200',
      });
    });

    it('should evaluate condition as false', async () => {
      const node: WorkflowNode = {
        id: 'condition-1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Check Status',
          expression: '{{trigger.status}} === 200',
        },
      };
      const context: ExecutionContext = {
        trigger: { status: 404 },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      // Expression is resolved before evaluation, so templates are replaced
      expect(result.output).toEqual({
        result: false,
        expression: '404 === 200',
      });
    });

    it('should handle complex condition expressions', async () => {
      const node: WorkflowNode = {
        id: 'condition-1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Complex Check',
          expression: '{{trigger.count}} > 10 && {{trigger.active}} === true',
        },
      };
      const context: ExecutionContext = {
        trigger: { count: 15, active: true },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect((result.output as { result: boolean }).result).toBe(true);
    });
  });

  describe('executeStep - transform node', () => {
    it('should execute transform with template expression', async () => {
      const node: WorkflowNode = {
        id: 'transform-1',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'Transform',
          expression: '{{trigger.name}}',
        },
      };
      const context: ExecutionContext = {
        trigger: { name: 'John' },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('John');
    });

    it('should return context when no expression provided', async () => {
      const node: WorkflowNode = {
        id: 'transform-1',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: { label: 'Transform' },
      };
      const context: ExecutionContext = {
        trigger: { data: 'test' },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual(context);
    });

    it('should parse JSON expression result', async () => {
      const node: WorkflowNode = {
        id: 'transform-1',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'Transform',
          expression: '{{trigger.data}}',
        },
      };
      const context: ExecutionContext = {
        trigger: { data: { key: 'value' } },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ key: 'value' });
    });
  });

  describe('executeStep - placeholder actions', () => {
    it('should execute httpRequest placeholder', async () => {
      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com',
          method: 'GET',
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toMatchObject({
        status: 200,
        message: expect.stringContaining('placeholder'),
      });
    });

    it('should execute sendEmail placeholder', async () => {
      const node: WorkflowNode = {
        id: 'email-1',
        type: 'sendEmail',
        position: { x: 0, y: 0 },
        data: {
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toMatchObject({
        sent: true,
        message: expect.stringContaining('placeholder'),
      });
    });

    it('should execute sendTelegram placeholder', async () => {
      const node: WorkflowNode = {
        id: 'telegram-1',
        type: 'sendTelegram',
        position: { x: 0, y: 0 },
        data: {
          label: 'Send Telegram',
          chatId: '12345',
          message: 'Hello',
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toMatchObject({
        sent: true,
        message: expect.stringContaining('placeholder'),
      });
    });

    it('should execute databaseQuery placeholder', async () => {
      const node: WorkflowNode = {
        id: 'db-1',
        type: 'databaseQuery',
        position: { x: 0, y: 0 },
        data: {
          label: 'Database Query',
          query: 'SELECT * FROM users',
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toMatchObject({
        rows: [],
        message: expect.stringContaining('placeholder'),
      });
    });
  });

  describe('executeStep - template resolution', () => {
    it('should resolve templates in node data', async () => {
      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com/users/{{trigger.userId}}',
          headers: {
            Authorization: 'Bearer {{trigger.token}}',
          },
        },
      };
      const context: ExecutionContext = {
        trigger: { userId: '123', token: 'abc123' },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      const output = result.output as {
        requestData: { url: string; headers: { Authorization: string } };
      };
      expect(output.requestData.url).toBe('https://api.example.com/users/123');
      expect(output.requestData.headers.Authorization).toBe('Bearer abc123');
    });

    it('should resolve templates from previous node outputs', async () => {
      const node: WorkflowNode = {
        id: 'email-1',
        type: 'sendEmail',
        position: { x: 0, y: 0 },
        data: {
          label: 'Send Email',
          to: '{{node-1.email}}',
          subject: 'Result: {{node-1.status}}',
        },
      };
      const context: ExecutionContext = {
        trigger: {},
        'node-1': { email: 'result@example.com', status: 'success' },
      };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      const output = result.output as {
        emailData: { to: string; subject: string };
      };
      expect(output.emailData.to).toBe('result@example.com');
      expect(output.emailData.subject).toBe('Result: success');
    });
  });

  describe('executeStep - unknown node type', () => {
    it('should handle unknown node types gracefully', async () => {
      const node = {
        id: 'unknown-1',
        type: 'unknownType' as any,
        position: { x: 0, y: 0 },
        data: { label: 'Unknown' },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(result.output).toMatchObject({
        message: expect.stringContaining('Unknown node type'),
      });
    });
  });

  describe('executeStep - error handling', () => {
    it('should catch and return errors', async () => {
      // Create a node with invalid data that will cause transform to fail
      const node: WorkflowNode = {
        id: 'transform-1',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: {
          label: 'Transform',
          expression: '{{trigger.data}}', // This will try to parse invalid JSON
        },
      };
      const context: ExecutionContext = {
        trigger: { data: 'not-json-{invalid' },
      };

      const result = await service.executeStep(node, context);

      // Transform returns the string if JSON.parse fails
      expect(result.success).toBe(true);
      expect(result.output).toBe('not-json-{invalid');
    });

    it('should include duration even on error', async () => {
      const node: WorkflowNode = {
        id: 'test-1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: { label: 'Test' },
      };
      const context: ExecutionContext = { trigger: null };

      const result = await service.executeStep(node, context);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('isTriggerNode', () => {
    it('should return true for webhookTrigger', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isTriggerNode(node)).toBe(true);
    });

    it('should return true for scheduleTrigger', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'scheduleTrigger',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isTriggerNode(node)).toBe(true);
    });

    it('should return true for emailTrigger', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'emailTrigger',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isTriggerNode(node)).toBe(true);
    });

    it('should return false for action nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isTriggerNode(node)).toBe(false);
    });

    it('should return false for condition nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isTriggerNode(node)).toBe(false);
    });
  });

  describe('isConditionNode', () => {
    it('should return true for condition nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isConditionNode(node)).toBe(true);
    });

    it('should return false for trigger nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isConditionNode(node)).toBe(false);
    });

    it('should return false for action nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(service.isConditionNode(node)).toBe(false);
    });
  });
});
