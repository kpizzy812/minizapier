/* eslint-disable @typescript-eslint/unbound-method */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: { InputJsonValue: {} },
  TriggerType: {
    WEBHOOK: 'WEBHOOK',
    SCHEDULE: 'SCHEDULE',
    EMAIL: 'EMAIL',
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
import { TriggersController } from './triggers.controller';
import { TriggersService } from './triggers.service';
import { TriggerType } from './dto/triggers.dto';

describe('TriggersController', () => {
  let controller: TriggersController;
  let service: jest.Mocked<TriggersService>;

  const mockWebhookTrigger = {
    id: 'trigger-123',
    type: TriggerType.WEBHOOK,
    config: { secret: 'my-secret' },
    webhookUrl: 'https://api.example.com/webhooks/abc123',
    workflowId: 'wf-123',
  };

  const mockScheduleTrigger = {
    id: 'trigger-456',
    type: TriggerType.SCHEDULE,
    config: { cron: '0 0 9 * * 1-5', timezone: 'Europe/Moscow' },
    webhookUrl: null,
    workflowId: 'wf-456',
    isActive: true,
  };

  const mockEmailTrigger = {
    id: 'trigger-789',
    type: TriggerType.EMAIL,
    config: { address: 'trigger-abc@inbound.example.com' },
    webhookUrl: null,
    workflowId: 'wf-789',
  };

  beforeEach(async () => {
    const mockTriggersService = {
      create: jest.fn(),
      findByWorkflowId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      regenerateWebhookUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriggersController],
      providers: [{ provide: TriggersService, useValue: mockTriggersService }],
    }).compile();

    controller = module.get<TriggersController>(TriggersController);
    service = module.get(TriggersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a webhook trigger', async () => {
      service.create.mockResolvedValue(mockWebhookTrigger);

      const result = await controller.create('user-123', {
        workflowId: 'wf-123',
        type: TriggerType.WEBHOOK,
        config: { secret: 'my-secret' },
      });

      expect(result).toEqual({
        data: mockWebhookTrigger,
        message: 'Trigger created successfully',
      });
      expect(service.create).toHaveBeenCalledWith('user-123', {
        workflowId: 'wf-123',
        type: TriggerType.WEBHOOK,
        config: { secret: 'my-secret' },
      });
    });

    it('should create a schedule trigger', async () => {
      service.create.mockResolvedValue(mockScheduleTrigger);

      const result = await controller.create('user-123', {
        workflowId: 'wf-456',
        type: TriggerType.SCHEDULE,
        config: { cron: '0 0 9 * * 1-5' },
      });

      expect(result).toEqual({
        data: mockScheduleTrigger,
        message: 'Trigger created successfully',
      });
    });

    it('should create an email trigger', async () => {
      service.create.mockResolvedValue(mockEmailTrigger);

      const result = await controller.create('user-123', {
        workflowId: 'wf-789',
        type: TriggerType.EMAIL,
        config: {},
      });

      expect(result).toEqual({
        data: mockEmailTrigger,
        message: 'Trigger created successfully',
      });
    });

    it('should throw when workflow already has a trigger', async () => {
      service.create.mockRejectedValue(
        new ConflictException('Workflow already has a trigger'),
      );

      await expect(
        controller.create('user-123', {
          workflowId: 'wf-123',
          type: TriggerType.WEBHOOK,
          config: {},
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByWorkflow', () => {
    it('should return trigger for workflow', async () => {
      service.findByWorkflowId.mockResolvedValue(mockWebhookTrigger);

      const result = await controller.findByWorkflow('user-123', 'wf-123');

      expect(result).toEqual({ data: mockWebhookTrigger });
      expect(service.findByWorkflowId).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
    });

    it('should return null when workflow has no trigger', async () => {
      service.findByWorkflowId.mockResolvedValue(null);

      const result = await controller.findByWorkflow('user-123', 'wf-123');

      expect(result).toEqual({ data: null });
    });

    it('should throw when workflow not found', async () => {
      service.findByWorkflowId.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(
        controller.findByWorkflow('user-123', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return trigger by id', async () => {
      service.findOne.mockResolvedValue(mockWebhookTrigger);

      const result = await controller.findOne('user-123', 'trigger-123');

      expect(result).toEqual({ data: mockWebhookTrigger });
      expect(service.findOne).toHaveBeenCalledWith('trigger-123', 'user-123');
    });

    it('should throw when trigger not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Trigger not found'),
      );

      await expect(controller.findOne('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a trigger config', async () => {
      const updatedTrigger = {
        ...mockWebhookTrigger,
        config: { secret: 'new-secret' },
      };
      service.update.mockResolvedValue(updatedTrigger);

      const result = await controller.update('user-123', 'trigger-123', {
        config: { secret: 'new-secret' },
      });

      expect(result).toEqual({
        data: updatedTrigger,
        message: 'Trigger updated successfully',
      });
      expect(service.update).toHaveBeenCalledWith('trigger-123', 'user-123', {
        config: { secret: 'new-secret' },
      });
    });

    it('should throw when trigger not found', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Trigger not found'),
      );

      await expect(
        controller.update('user-123', 'missing', {
          config: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a trigger', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('user-123', 'trigger-123');

      expect(result).toEqual({ message: 'Trigger deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith('trigger-123', 'user-123');
    });

    it('should throw when trigger not found', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Trigger not found'),
      );

      await expect(controller.remove('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a trigger', async () => {
      const activatedTrigger = { ...mockScheduleTrigger, isActive: true };
      service.activate.mockResolvedValue(activatedTrigger);

      const result = await controller.activate('user-123', 'trigger-456');

      expect(result).toEqual({
        data: activatedTrigger,
        message: 'Trigger activated',
      });
      expect(service.activate).toHaveBeenCalledWith('trigger-456', 'user-123');
    });

    it('should throw when trigger not found', async () => {
      service.activate.mockRejectedValue(
        new NotFoundException('Trigger not found'),
      );

      await expect(controller.activate('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a trigger', async () => {
      const deactivatedTrigger = { ...mockScheduleTrigger, isActive: false };
      service.deactivate.mockResolvedValue(deactivatedTrigger);

      const result = await controller.deactivate('user-123', 'trigger-456');

      expect(result).toEqual({
        data: deactivatedTrigger,
        message: 'Trigger deactivated',
      });
      expect(service.deactivate).toHaveBeenCalledWith(
        'trigger-456',
        'user-123',
      );
    });

    it('should throw when trigger not found', async () => {
      service.deactivate.mockRejectedValue(
        new NotFoundException('Trigger not found'),
      );

      await expect(
        controller.deactivate('user-123', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateWebhookUrl', () => {
    it('should regenerate webhook URL', async () => {
      const updatedTrigger = {
        ...mockWebhookTrigger,
        webhookUrl: 'https://api.example.com/webhooks/newtoken123',
      };
      service.regenerateWebhookUrl.mockResolvedValue(updatedTrigger);

      const result = await controller.regenerateWebhookUrl(
        'user-123',
        'trigger-123',
      );

      expect(result).toEqual({
        data: updatedTrigger,
        message: 'Webhook URL regenerated',
      });
      expect(service.regenerateWebhookUrl).toHaveBeenCalledWith(
        'trigger-123',
        'user-123',
      );
    });

    it('should throw when trigger not found', async () => {
      service.regenerateWebhookUrl.mockRejectedValue(
        new NotFoundException('Trigger not found'),
      );

      await expect(
        controller.regenerateWebhookUrl('user-123', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when trigger is not a webhook', async () => {
      service.regenerateWebhookUrl.mockRejectedValue(
        new BadRequestException('Not a webhook trigger'),
      );

      await expect(
        controller.regenerateWebhookUrl('user-123', 'trigger-456'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
