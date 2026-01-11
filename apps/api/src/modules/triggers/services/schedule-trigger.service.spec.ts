/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Mock Prisma client before importing services
jest.mock('../../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    trigger: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ScheduleTriggerService } from './schedule-trigger.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WORKFLOW_QUEUE } from '../../queue/queue.constants';

describe('ScheduleTriggerService', () => {
  let service: ScheduleTriggerService;
  let mockQueue: {
    upsertJobScheduler: jest.Mock;
    removeJobScheduler: jest.Mock;
    getJobSchedulers: jest.Mock;
  };
  let mockPrisma: {
    trigger: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockQueue = {
      upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
      removeJobScheduler: jest.fn().mockResolvedValue(true),
      getJobSchedulers: jest.fn().mockResolvedValue([]),
    };

    mockPrisma = {
      trigger: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleTriggerService,
        { provide: getQueueToken(WORKFLOW_QUEUE), useValue: mockQueue },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScheduleTriggerService>(ScheduleTriggerService);
  });

  describe('validateCron', () => {
    it('should validate correct 6-field cron expression', () => {
      expect(service.validateCron('0 0 * * * *')).toBe(true);
      expect(service.validateCron('30 15 10 * * *')).toBe(true);
      expect(service.validateCron('0 0 0 1 1 *')).toBe(true);
    });

    it('should validate cron with ranges and lists', () => {
      expect(service.validateCron('0 0 9-17 * * 1-5')).toBe(true);
      expect(service.validateCron('0 0,30 * * * *')).toBe(true);
      expect(service.validateCron('0 */15 * * * *')).toBe(true);
    });

    it('should reject invalid cron expressions', () => {
      expect(service.validateCron('invalid')).toBe(false);
      expect(service.validateCron('* * * * *')).toBe(false); // Only 5 fields
      expect(service.validateCron('')).toBe(false);
    });

    it('should reject 5-field cron expressions', () => {
      expect(service.validateCron('0 * * * *')).toBe(false);
    });

    it('should reject cron with invalid characters', () => {
      expect(service.validateCron('0 0 abc * * *')).toBe(false);
    });
  });

  describe('getNextExecutionTime', () => {
    it('should return next execution time for valid cron', () => {
      const nextTime = service.getNextExecutionTime('0 0 * * * *');

      expect(nextTime).toBeInstanceOf(Date);
      expect(nextTime!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid cron', () => {
      const nextTime = service.getNextExecutionTime('invalid-cron');

      expect(nextTime).toBeNull();
    });

    it('should respect timezone', () => {
      const utcTime = service.getNextExecutionTime('0 0 12 * * *', 'UTC');
      const laTime = service.getNextExecutionTime(
        '0 0 12 * * *',
        'America/Los_Angeles',
      );

      expect(utcTime).toBeInstanceOf(Date);
      expect(laTime).toBeInstanceOf(Date);
      // Times should be different due to timezone difference
      expect(utcTime!.toISOString()).not.toBe(laTime!.toISOString());
    });
  });

  describe('createSchedule', () => {
    it('should create schedule with BullMQ', async () => {
      const triggerId = 'trigger-123';
      const workflowId = 'workflow-456';
      const userId = 'user-789';
      const cron = '0 0 * * * *';

      await service.createSchedule(triggerId, workflowId, userId, cron);

      expect(mockQueue.removeJobScheduler).toHaveBeenCalledWith(
        `schedule-trigger:${triggerId}`,
      );
      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        `schedule-trigger:${triggerId}`,
        { pattern: cron, tz: undefined },
        expect.objectContaining({
          name: 'scheduled-execution',
          data: expect.objectContaining({
            triggerId,
            workflowId,
            userId,
            isScheduled: true,
          }),
        }),
      );
    });

    it('should include timezone in schedule config', async () => {
      const timezone = 'America/New_York';

      await service.createSchedule(
        'trigger-1',
        'workflow-1',
        'user-1',
        '0 0 * * * *',
        timezone,
      );

      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        expect.any(String),
        { pattern: '0 0 * * * *', tz: timezone },
        expect.any(Object),
      );
    });
  });

  describe('updateSchedule', () => {
    it('should call createSchedule for update', async () => {
      const createSpy = jest.spyOn(service, 'createSchedule');

      await service.updateSchedule(
        'trigger-1',
        'workflow-1',
        'user-1',
        '0 30 * * * *',
        'UTC',
      );

      expect(createSpy).toHaveBeenCalledWith(
        'trigger-1',
        'workflow-1',
        'user-1',
        '0 30 * * * *',
        'UTC',
      );
    });
  });

  describe('removeSchedule', () => {
    it('should remove schedule from BullMQ', async () => {
      const result = await service.removeSchedule('trigger-123');

      expect(mockQueue.removeJobScheduler).toHaveBeenCalledWith(
        'schedule-trigger:trigger-123',
      );
      expect(result).toBe(true);
    });

    it('should return false when removal fails', async () => {
      mockQueue.removeJobScheduler.mockRejectedValueOnce(
        new Error('Queue error'),
      );

      const result = await service.removeSchedule('trigger-123');

      expect(result).toBe(false);
    });
  });

  describe('pauseSchedule', () => {
    it('should remove schedule when pausing', async () => {
      const removeSpy = jest.spyOn(service, 'removeSchedule');

      await service.pauseSchedule('trigger-123');

      expect(removeSpy).toHaveBeenCalledWith('trigger-123');
    });
  });

  describe('resumeSchedule', () => {
    it('should recreate schedule when resuming', async () => {
      const mockTrigger = {
        id: 'trigger-123',
        type: 'SCHEDULE',
        workflowId: 'workflow-456',
        config: { cron: '0 0 * * * *', timezone: 'UTC' },
        workflow: { userId: 'user-789' },
      };

      mockPrisma.trigger.findUnique.mockResolvedValueOnce(mockTrigger);

      const result = await service.resumeSchedule('trigger-123');

      expect(result).toBe(true);
      expect(mockQueue.upsertJobScheduler).toHaveBeenCalled();
    });

    it('should return false for non-existent trigger', async () => {
      mockPrisma.trigger.findUnique.mockResolvedValueOnce(null);

      const result = await service.resumeSchedule('non-existent');

      expect(result).toBe(false);
    });

    it('should return false for non-schedule trigger', async () => {
      mockPrisma.trigger.findUnique.mockResolvedValueOnce({
        id: 'trigger-123',
        type: 'WEBHOOK',
        config: {},
        workflow: { userId: 'user-789' },
      });

      const result = await service.resumeSchedule('trigger-123');

      expect(result).toBe(false);
    });
  });

  describe('getActiveSchedulers', () => {
    it('should return list of active scheduler IDs', async () => {
      mockQueue.getJobSchedulers.mockResolvedValueOnce([
        { id: 'schedule-trigger:trigger-1' },
        { id: 'schedule-trigger:trigger-2' },
        { id: 'other-job' },
      ]);

      const schedulers = await service.getActiveSchedulers();

      expect(schedulers).toContain('trigger-1');
      expect(schedulers).toContain('trigger-2');
      expect(schedulers).not.toContain('other-job');
    });

    it('should handle empty scheduler list', async () => {
      mockQueue.getJobSchedulers.mockResolvedValueOnce([]);

      const schedulers = await service.getActiveSchedulers();

      expect(schedulers).toEqual([]);
    });
  });

  describe('buildScheduleTriggerData', () => {
    it('should build trigger data with correct structure', () => {
      const data = service.buildScheduleTriggerData();

      expect(data.type).toBe('schedule');
      expect(data.timestamp).toBeDefined();
      expect(data.scheduledAt).toBeDefined();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
