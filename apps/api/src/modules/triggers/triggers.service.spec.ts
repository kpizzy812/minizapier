/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    workflow: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    trigger: {
      create: jest.fn(),
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
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TriggersService } from './triggers.service';
import { WebhookTriggerService } from './services/webhook-trigger.service';
import { ScheduleTriggerService } from './services/schedule-trigger.service';
import { EmailTriggerService } from './services/email-trigger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TriggerType } from './dto/triggers.dto';

describe('TriggersService', () => {
  let service: TriggersService;
  let prisma: jest.Mocked<PrismaService>;
  let webhookTrigger: jest.Mocked<WebhookTriggerService>;
  let scheduleTrigger: jest.Mocked<ScheduleTriggerService>;
  let emailTrigger: jest.Mocked<EmailTriggerService>;

  const mockWorkflow = {
    id: 'workflow-123',
    userId: 'user-456',
    name: 'Test Workflow',
    definition: {},
    isActive: true,
    trigger: null,
  };

  const mockTrigger = {
    id: 'trigger-789',
    type: 'WEBHOOK',
    config: { secret: 'test-secret' },
    webhookUrl: 'https://api.example.com/webhooks/token123',
    workflowId: 'workflow-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      workflow: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      trigger: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockWebhookService = {
      generateWebhookToken: jest.fn().mockReturnValue('generated-token'),
      generateWebhookUrl: jest
        .fn()
        .mockReturnValue('https://api.example.com/webhooks/generated-token'),
      generateSecret: jest.fn().mockReturnValue('generated-secret'),
      verifySignature: jest.fn().mockReturnValue(true),
    };

    const mockScheduleService = {
      validateCron: jest.fn().mockReturnValue(true),
      createSchedule: jest.fn().mockResolvedValue(undefined),
      updateSchedule: jest.fn().mockResolvedValue(undefined),
      removeSchedule: jest.fn().mockResolvedValue(true),
      pauseSchedule: jest.fn().mockResolvedValue(true),
      resumeSchedule: jest.fn().mockResolvedValue(true),
    };

    const mockEmailService = {
      generateEmailAddress: jest
        .fn()
        .mockReturnValue('trigger-abc123@inbound.example.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookTriggerService, useValue: mockWebhookService },
        { provide: ScheduleTriggerService, useValue: mockScheduleService },
        { provide: EmailTriggerService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<TriggersService>(TriggersService);
    prisma = module.get(PrismaService);
    webhookTrigger = module.get(WebhookTriggerService);
    scheduleTrigger = module.get(ScheduleTriggerService);
    emailTrigger = module.get(EmailTriggerService);
  });

  describe('create', () => {
    it('should create webhook trigger', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(mockWorkflow);
      prisma.trigger.create.mockResolvedValueOnce(mockTrigger);

      const result = await service.create('user-456', {
        workflowId: 'workflow-123',
        type: TriggerType.WEBHOOK,
        config: {},
      });

      expect(result.id).toBe('trigger-789');
      expect(result.type).toBe(TriggerType.WEBHOOK);
      expect(webhookTrigger.generateWebhookToken).toHaveBeenCalled();
      expect(webhookTrigger.generateWebhookUrl).toHaveBeenCalled();
    });

    it('should create schedule trigger', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(mockWorkflow);
      prisma.trigger.create.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        config: { cron: '0 0 * * * *', timezone: 'UTC' },
        webhookUrl: null,
      });

      const result = await service.create('user-456', {
        workflowId: 'workflow-123',
        type: TriggerType.SCHEDULE,
        config: { cron: '0 0 * * * *' },
      });

      expect(result.type).toBe(TriggerType.SCHEDULE);
      expect(scheduleTrigger.validateCron).toHaveBeenCalledWith('0 0 * * * *');
      expect(scheduleTrigger.createSchedule).toHaveBeenCalled();
    });

    it('should create email trigger', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(mockWorkflow);
      prisma.trigger.create.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'EMAIL',
        config: { address: 'trigger-abc123@inbound.example.com' },
        webhookUrl: null,
      });

      const result = await service.create('user-456', {
        workflowId: 'workflow-123',
        type: TriggerType.EMAIL,
        config: {},
      });

      expect(result.type).toBe(TriggerType.EMAIL);
      expect(emailTrigger.generateEmailAddress).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create('user-456', {
          workflowId: 'non-existent',
          type: TriggerType.WEBHOOK,
          config: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when workflow already has trigger', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce({
        ...mockWorkflow,
        trigger: mockTrigger,
      });

      await expect(
        service.create('user-456', {
          workflowId: 'workflow-123',
          type: TriggerType.WEBHOOK,
          config: {},
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid cron', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(mockWorkflow);
      scheduleTrigger.validateCron.mockReturnValueOnce(false);

      await expect(
        service.create('user-456', {
          workflowId: 'workflow-123',
          type: TriggerType.SCHEDULE,
          config: { cron: 'invalid-cron' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByWorkflowId', () => {
    it('should return trigger for workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce({
        ...mockWorkflow,
        trigger: mockTrigger,
      });

      const result = await service.findByWorkflowId('workflow-123', 'user-456');

      expect(result).toBeDefined();
      expect(result!.id).toBe('trigger-789');
    });

    it('should return null when workflow has no trigger', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(mockWorkflow);

      const result = await service.findByWorkflowId('workflow-123', 'user-456');

      expect(result).toBeNull();
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findByWorkflowId('non-existent', 'user-456'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return trigger by ID', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'user-456' },
      });

      const result = await service.findOne('trigger-789', 'user-456');

      expect(result.id).toBe('trigger-789');
    });

    it('should throw NotFoundException for wrong user', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'other-user' },
      });

      await expect(service.findOne('trigger-789', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByWebhookToken', () => {
    it('should find trigger by webhook token', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: {
          id: 'workflow-123',
          userId: 'user-456',
          definition: {},
          isActive: true,
        },
      });

      const result = await service.findByWebhookToken('token123');

      expect(result).toBeDefined();
      expect(result!.trigger.id).toBe('trigger-789');
      expect(result!.workflow.id).toBe('workflow-123');
    });

    it('should return null for non-existent token', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce(null);

      const result = await service.findByWebhookToken('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailAddress', () => {
    it('should find trigger by email address', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'EMAIL',
        config: { address: 'trigger-abc123@inbound.com' },
        workflow: {
          id: 'workflow-123',
          userId: 'user-456',
          definition: {},
          isActive: true,
        },
      });

      const result = await service.findByEmailAddress(
        'trigger-abc123@inbound.com',
      );

      expect(result).toBeDefined();
      expect(result!.trigger.type).toBe('EMAIL');
    });
  });

  describe('update', () => {
    it('should update trigger config', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'user-456' },
      });
      prisma.trigger.update.mockResolvedValueOnce({
        ...mockTrigger,
        config: { ...mockTrigger.config, newField: 'value' },
      });

      const result = await service.update('trigger-789', 'user-456', {
        config: { newField: 'value' },
      });

      expect(prisma.trigger.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update schedule trigger cron', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        config: { cron: '0 0 * * * *' },
        workflow: { userId: 'user-456' },
      });
      prisma.trigger.update.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        config: { cron: '0 30 * * * *' },
      });

      await service.update('trigger-789', 'user-456', {
        config: { cron: '0 30 * * * *' },
      });

      expect(scheduleTrigger.validateCron).toHaveBeenCalledWith('0 30 * * * *');
      expect(scheduleTrigger.updateSchedule).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid cron update', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        config: { cron: '0 0 * * * *' },
        workflow: { userId: 'user-456' },
      });
      scheduleTrigger.validateCron.mockReturnValueOnce(false);

      await expect(
        service.update('trigger-789', 'user-456', {
          config: { cron: 'invalid' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove trigger', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'user-456' },
      });
      prisma.trigger.delete.mockResolvedValueOnce(mockTrigger);

      await service.remove('trigger-789', 'user-456');

      expect(prisma.trigger.delete).toHaveBeenCalledWith({
        where: { id: 'trigger-789' },
      });
    });

    it('should remove schedule job when deleting schedule trigger', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        workflow: { userId: 'user-456' },
      });
      prisma.trigger.delete.mockResolvedValueOnce(mockTrigger);

      await service.remove('trigger-789', 'user-456');

      expect(scheduleTrigger.removeSchedule).toHaveBeenCalledWith(
        'trigger-789',
      );
    });

    it('should throw NotFoundException for non-existent trigger', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove('non-existent', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate workflow', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'user-456' },
      });
      prisma.workflow.update.mockResolvedValueOnce({
        ...mockWorkflow,
        isActive: true,
      });

      const result = await service.activate('trigger-789', 'user-456');

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
        data: { isActive: true },
      });
      expect(result).toBeDefined();
    });

    it('should resume schedule trigger on activate', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        workflow: { userId: 'user-456' },
      });
      prisma.workflow.update.mockResolvedValueOnce({
        ...mockWorkflow,
        isActive: true,
      });

      await service.activate('trigger-789', 'user-456');

      expect(scheduleTrigger.resumeSchedule).toHaveBeenCalledWith(
        'trigger-789',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate workflow', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'user-456' },
      });
      prisma.workflow.update.mockResolvedValueOnce({
        ...mockWorkflow,
        isActive: false,
      });

      const result = await service.deactivate('trigger-789', 'user-456');

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
        data: { isActive: false },
      });
      expect(result).toBeDefined();
    });

    it('should pause schedule trigger on deactivate', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        workflow: { userId: 'user-456' },
      });
      prisma.workflow.update.mockResolvedValueOnce({
        ...mockWorkflow,
        isActive: false,
      });

      await service.deactivate('trigger-789', 'user-456');

      expect(scheduleTrigger.pauseSchedule).toHaveBeenCalledWith('trigger-789');
    });
  });

  describe('regenerateWebhookUrl', () => {
    it('should generate new webhook URL', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        workflow: { userId: 'user-456' },
      });
      prisma.trigger.update.mockResolvedValueOnce({
        ...mockTrigger,
        webhookUrl: 'https://api.example.com/webhooks/new-token',
      });

      const result = await service.regenerateWebhookUrl(
        'trigger-789',
        'user-456',
      );

      expect(webhookTrigger.generateWebhookToken).toHaveBeenCalled();
      expect(webhookTrigger.generateWebhookUrl).toHaveBeenCalled();
      expect(prisma.trigger.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for non-webhook trigger', async () => {
      prisma.trigger.findFirst.mockResolvedValueOnce({
        ...mockTrigger,
        type: 'SCHEDULE',
        workflow: { userId: 'user-456' },
      });

      await expect(
        service.regenerateWebhookUrl('trigger-789', 'user-456'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
