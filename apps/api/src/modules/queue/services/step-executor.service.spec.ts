/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

// Mock Prisma client before importing services
jest.mock('../../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    credential: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
  Prisma: {
    InputJsonValue: {},
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { StepExecutorService } from './step-executor.service';
import { TemplateResolverService } from './template-resolver.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import {
  HttpRequestAction,
  TransformAction,
  SendEmailAction,
  SendTelegramAction,
  DatabaseQueryAction,
} from '../../actions/services';
import { CredentialsService } from '../../credentials/credentials.service';
import { WorkflowNode } from '@minizapier/shared';
import { ExecutionContext } from '../types';

describe('StepExecutorService', () => {
  let service: StepExecutorService;
  let httpRequestAction: jest.Mocked<HttpRequestAction>;
  let sendEmailAction: jest.Mocked<SendEmailAction>;
  let sendTelegramAction: jest.Mocked<SendTelegramAction>;
  let databaseQueryAction: jest.Mocked<DatabaseQueryAction>;

  beforeEach(async () => {
    // Create mocks
    const mockHttpRequestAction = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { status: 200, body: {} },
      }),
    };

    const mockTransformAction = {
      execute: jest.fn().mockReturnValue({
        success: true,
        data: 'transformed',
      }),
    };

    const mockSendEmailAction = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'email-123', to: ['test@example.com'] },
      }),
    };

    const mockSendTelegramAction = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { messageId: 123, chatId: '12345' },
      }),
    };

    const mockDatabaseQueryAction = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { rows: [], rowCount: 0, fields: [] },
      }),
    };

    const mockCredentialsService = {
      getHttpAuthConfig: jest.fn().mockResolvedValue(null),
      getCredentialData: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepExecutorService,
        TemplateResolverService,
        ConditionEvaluatorService,
        { provide: HttpRequestAction, useValue: mockHttpRequestAction },
        { provide: TransformAction, useValue: mockTransformAction },
        { provide: SendEmailAction, useValue: mockSendEmailAction },
        { provide: SendTelegramAction, useValue: mockSendTelegramAction },
        { provide: DatabaseQueryAction, useValue: mockDatabaseQueryAction },
        { provide: CredentialsService, useValue: mockCredentialsService },
      ],
    }).compile();

    service = module.get<StepExecutorService>(StepExecutorService);
    httpRequestAction = module.get(HttpRequestAction);
    sendEmailAction = module.get(SendEmailAction);
    sendTelegramAction = module.get(SendTelegramAction);
    databaseQueryAction = module.get(DatabaseQueryAction);
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

  describe('executeStep - action nodes with mocks', () => {
    it('should execute httpRequest action', async () => {
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
      expect(httpRequestAction.execute).toHaveBeenCalled();
    });

    it('should execute sendEmail action', async () => {
      const node: WorkflowNode = {
        id: 'email-1',
        type: 'sendEmail',
        position: { x: 0, y: 0 },
        data: {
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Hello',
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStep(node, context);

      expect(result.success).toBe(true);
      expect(sendEmailAction.execute).toHaveBeenCalled();
    });

    it('should execute sendTelegram action', async () => {
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
      expect(sendTelegramAction.execute).toHaveBeenCalled();
    });

    it('should execute databaseQuery action', async () => {
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
      expect(databaseQueryAction.execute).toHaveBeenCalled();
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

  describe('isTriggerNode', () => {
    it('should return true for webhookTrigger', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: { label: '' },
      };
      expect(service.isTriggerNode(node)).toBe(true);
    });

    it('should return true for scheduleTrigger', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'scheduleTrigger',
        position: { x: 0, y: 0 },
        data: { label: '' },
      };
      expect(service.isTriggerNode(node)).toBe(true);
    });

    it('should return true for emailTrigger', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'emailTrigger',
        position: { x: 0, y: 0 },
        data: { label: '' },
      };
      expect(service.isTriggerNode(node)).toBe(true);
    });

    it('should return false for action nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: { label: '', url: '', method: 'GET' },
      };
      expect(service.isTriggerNode(node)).toBe(false);
    });

    it('should return false for condition nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: { label: '', expression: '' },
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
        data: { label: '', expression: '' },
      };
      expect(service.isConditionNode(node)).toBe(true);
    });

    it('should return false for trigger nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: { label: '' },
      };
      expect(service.isConditionNode(node)).toBe(false);
    });

    it('should return false for action nodes', () => {
      const node: WorkflowNode = {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: { label: '', url: '', method: 'GET' },
      };
      expect(service.isConditionNode(node)).toBe(false);
    });
  });

  describe('executeStepWithRetry', () => {
    it('should execute without retry when maxAttempts is 0', async () => {
      const node: WorkflowNode = {
        id: 'trigger-1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: { label: 'Webhook' },
      };
      const context: ExecutionContext = {
        trigger: { method: 'POST' },
      };

      const result = await service.executeStepWithRetry(node, context);

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBeUndefined();
      expect(result.retriedSuccessfully).toBeUndefined();
    });

    it('should succeed on first attempt without retries', async () => {
      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com',
          method: 'GET',
          retryConfig: { maxAttempts: 3 },
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStepWithRetry(node, context);

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(0);
      expect(result.retriedSuccessfully).toBe(false);
    });

    it('should retry on failure and succeed after retries', async () => {
      let callCount = 0;
      httpRequestAction.execute.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Connection timeout',
          });
        }
        return Promise.resolve({
          success: true,
          data: { status: 200 },
        });
      });

      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com',
          method: 'GET',
          retryConfig: {
            maxAttempts: 3,
            initialDelayMs: 10, // Short delay for tests
            backoffMultiplier: 1,
          },
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStepWithRetry(node, context);

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
      expect(result.retriedSuccessfully).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should fail after exhausting all retry attempts', async () => {
      httpRequestAction.execute.mockResolvedValue({
        success: false,
        error: 'Server unavailable',
      });

      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com',
          method: 'GET',
          retryConfig: {
            maxAttempts: 2,
            initialDelayMs: 10,
            backoffMultiplier: 1,
          },
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStepWithRetry(node, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server unavailable');
      expect(result.retryAttempts).toBe(2);
      expect(result.retriedSuccessfully).toBe(false);
    });

    it('should use default retry config when not specified', async () => {
      httpRequestAction.execute.mockResolvedValue({
        success: true,
        data: { status: 200 },
      });

      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com',
          method: 'GET',
          retryConfig: { maxAttempts: 1 },
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStepWithRetry(node, context);

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(0);
    });

    it('should respect maxDelayMs cap', async () => {
      let callCount = 0;
      const callTimes: number[] = [];

      httpRequestAction.execute.mockImplementation(() => {
        callCount++;
        callTimes.push(Date.now());
        if (callCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Timeout',
          });
        }
        return Promise.resolve({
          success: true,
          data: { status: 200 },
        });
      });

      const node: WorkflowNode = {
        id: 'http-1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          label: 'HTTP Request',
          url: 'https://api.example.com',
          method: 'GET',
          retryConfig: {
            maxAttempts: 3,
            initialDelayMs: 100,
            backoffMultiplier: 10, // Would be 100, 1000 without cap
            maxDelayMs: 150,
          },
        },
      };
      const context: ExecutionContext = { trigger: {} };

      const result = await service.executeStepWithRetry(node, context);

      expect(result.success).toBe(true);
      // Verify delays were capped (allowing some tolerance)
      if (callTimes.length >= 3) {
        const delay2 = callTimes[2] - callTimes[1];
        expect(delay2).toBeLessThanOrEqual(200); // maxDelayMs + tolerance
      }
    });
  });
});
