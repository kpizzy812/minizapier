/* eslint-disable @typescript-eslint/unbound-method */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: { InputJsonValue: {} },
  ExecutionStatus: {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    PAUSED: 'PAUSED',
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';

describe('ExecutionsController', () => {
  let controller: ExecutionsController;
  let service: jest.Mocked<ExecutionsService>;

  const mockExecution = {
    id: 'exec-123',
    workflowId: 'wf-123',
    status: 'SUCCESS',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    finishedAt: new Date('2024-01-01T10:00:05Z'),
    input: { trigger: 'webhook', data: { foo: 'bar' } },
    output: { result: 'ok' },
    error: null,
  };

  const mockExecutionWithSteps = {
    ...mockExecution,
    steps: [
      {
        id: 'step-1',
        executionId: 'exec-123',
        nodeId: 'node-1',
        nodeName: 'Webhook Trigger',
        status: 'success',
        input: { foo: 'bar' },
        output: { processed: true },
        error: null,
        duration: 100,
        createdAt: new Date('2024-01-01T10:00:01Z'),
      },
      {
        id: 'step-2',
        executionId: 'exec-123',
        nodeId: 'node-2',
        nodeName: 'HTTP Request',
        status: 'success',
        input: { url: 'https://api.example.com' },
        output: { statusCode: 200 },
        error: null,
        duration: 500,
        createdAt: new Date('2024-01-01T10:00:02Z'),
      },
    ],
  };

  const mockStepLogs = [
    {
      id: 'step-1',
      executionId: 'exec-123',
      nodeId: 'node-1',
      nodeName: 'Webhook Trigger',
      status: 'success',
      input: { foo: 'bar' },
      output: { processed: true },
      error: null,
      duration: 100,
      createdAt: new Date('2024-01-01T10:00:01Z'),
    },
  ];

  const mockStats = {
    total: 100,
    success: 85,
    failed: 10,
    pending: 3,
    running: 2,
    avgDuration: 1500,
    successRate: 89.47,
  };

  beforeEach(async () => {
    const mockExecutionsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStepLogs: jest.fn(),
      getStats: jest.fn(),
      replay: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExecutionsController],
      providers: [
        { provide: ExecutionsService, useValue: mockExecutionsService },
      ],
    }).compile();

    controller = module.get<ExecutionsController>(ExecutionsController);
    service = module.get(ExecutionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated executions', async () => {
      service.findAll.mockResolvedValue({
        executions: [mockExecution],
        total: 1,
      });

      const result = await controller.findAll('user-123', {});

      expect(result).toEqual({
        executions: [mockExecution],
        total: 1,
        skip: 0,
        take: 20,
      });
      expect(service.findAll).toHaveBeenCalledWith('user-123', {});
    });

    it('should filter by workflowId', async () => {
      service.findAll.mockResolvedValue({
        executions: [mockExecution],
        total: 1,
      });

      await controller.findAll('user-123', { workflowId: 'wf-123' });

      expect(service.findAll).toHaveBeenCalledWith('user-123', {
        workflowId: 'wf-123',
      });
    });

    it('should filter by status', async () => {
      service.findAll.mockResolvedValue({
        executions: [mockExecution],
        total: 1,
      });

      await controller.findAll('user-123', { status: 'SUCCESS' });

      expect(service.findAll).toHaveBeenCalledWith('user-123', {
        status: 'SUCCESS',
      });
    });

    it('should support pagination', async () => {
      service.findAll.mockResolvedValue({
        executions: [mockExecution],
        total: 50,
      });

      const result = await controller.findAll('user-123', {
        skip: 10,
        take: 5,
      });

      expect(result).toEqual({
        executions: [mockExecution],
        total: 50,
        skip: 10,
        take: 5,
      });
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats('user-123');

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should filter stats by workflowId', async () => {
      service.getStats.mockResolvedValue(mockStats);

      await controller.getStats('user-123', 'wf-123');

      expect(service.getStats).toHaveBeenCalledWith('user-123', 'wf-123');
    });
  });

  describe('findOne', () => {
    it('should return execution with steps', async () => {
      service.findOne.mockResolvedValue(mockExecutionWithSteps);

      const result = await controller.findOne('exec-123', 'user-123');

      expect(result).toEqual(mockExecutionWithSteps);
      expect(service.findOne).toHaveBeenCalledWith('exec-123', 'user-123');
    });

    it('should throw when execution not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Execution not found'),
      );

      await expect(controller.findOne('missing', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStepLogs', () => {
    it('should return step logs for execution', async () => {
      service.getStepLogs.mockResolvedValue(mockStepLogs);

      const result = await controller.getStepLogs('exec-123', 'user-123');

      expect(result).toEqual(mockStepLogs);
      expect(service.getStepLogs).toHaveBeenCalledWith('exec-123', 'user-123');
    });

    it('should throw when execution not found', async () => {
      service.getStepLogs.mockRejectedValue(
        new NotFoundException('Execution not found'),
      );

      await expect(
        controller.getStepLogs('missing', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('replay', () => {
    it('should replay an execution', async () => {
      const newExecution = {
        ...mockExecution,
        id: 'exec-456',
        status: 'PENDING',
      };
      service.replay.mockResolvedValue(newExecution);

      const result = await controller.replay('exec-123', 'user-123');

      expect(result).toEqual(newExecution);
      expect(service.replay).toHaveBeenCalledWith('exec-123', 'user-123');
    });

    it('should throw when original execution not found', async () => {
      service.replay.mockRejectedValue(
        new NotFoundException('Execution not found'),
      );

      await expect(controller.replay('missing', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending execution', async () => {
      const cancelledExecution = { ...mockExecution, status: 'FAILED' };
      service.cancel.mockResolvedValue(cancelledExecution);

      const result = await controller.cancel('exec-123', 'user-123');

      expect(result).toEqual(cancelledExecution);
      expect(service.cancel).toHaveBeenCalledWith('exec-123', 'user-123');
    });

    it('should throw when execution not found', async () => {
      service.cancel.mockRejectedValue(
        new NotFoundException('Execution not found'),
      );

      await expect(controller.cancel('missing', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when execution cannot be cancelled', async () => {
      service.cancel.mockRejectedValue(
        new BadRequestException('Cannot cancel this execution'),
      );

      await expect(controller.cancel('exec-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
