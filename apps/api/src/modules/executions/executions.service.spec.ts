/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    workflow: {
      findFirst: jest.fn(),
    },
    execution: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    stepLog: {
      findMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
  Prisma: {
    ExecutionWhereInput: {},
    InputJsonValue: {},
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { ExecutionsService } from './executions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WORKFLOW_QUEUE } from '../queue/queue.constants';

// Mock data types
interface MockWorkflow {
  id: string;
  userId: string;
  name: string;
  definition: unknown;
}

interface MockExecution {
  id: string;
  workflowId: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

// Mock data
const mockWorkflow: MockWorkflow = {
  id: 'workflow-1',
  userId: 'user-1',
  name: 'Test Workflow',
  definition: {
    nodes: [
      {
        id: 'trigger',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: {},
      },
    ],
    edges: [],
  },
};

const mockExecution: MockExecution = {
  id: 'execution-1',
  workflowId: 'workflow-1',
  status: 'PENDING',
  input: { test: true },
  output: null,
  error: null,
  startedAt: new Date(),
  finishedAt: null,
};

// Mock services
const mockPrismaService = {
  workflow: {
    findFirst: jest.fn(),
  },
  execution: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  stepLog: {
    findMany: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
};

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let prisma: typeof mockPrismaService;
  let queue: typeof mockQueue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken(WORKFLOW_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ExecutionsService>(ExecutionsService);
    prisma = module.get(PrismaService);
    queue = module.get(getQueueToken(WORKFLOW_QUEUE));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create execution and queue job', async () => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      prisma.execution.create.mockResolvedValue(mockExecution);
      queue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.create('workflow-1', 'user-1', {
        test: true,
      });

      expect(result).toEqual(mockExecution);
      expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
        where: { id: 'workflow-1', userId: 'user-1' },
      });
      expect(prisma.execution.create).toHaveBeenCalledWith({
        data: {
          workflowId: 'workflow-1',
          status: 'PENDING',
          input: { test: true },
        },
      });
      expect(queue.add).toHaveBeenCalledWith(
        'execute',
        expect.objectContaining({
          workflowId: 'workflow-1',
          executionId: 'execution-1',
          triggerData: { test: true },
        }),
        { jobId: 'execution-1' },
      );
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.create('not-found', 'user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for workflow from different user', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.create('workflow-1', 'wrong-user', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const mockExecutionWithWorkflow = {
      ...mockExecution,
      workflow: { name: 'Test Workflow' },
    };

    it('should return executions and total count', async () => {
      prisma.execution.findMany.mockResolvedValue([mockExecutionWithWorkflow]);
      prisma.execution.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {});

      expect(result).toEqual({
        executions: [mockExecutionWithWorkflow],
        total: 1,
      });
      expect(prisma.execution.findMany).toHaveBeenCalledWith({
        where: { workflow: { userId: 'user-1' } },
        skip: 0,
        take: 20,
        orderBy: { startedAt: 'desc' },
        include: { workflow: { select: { name: true } } },
      });
    });

    it('should support pagination', async () => {
      prisma.execution.findMany.mockResolvedValue([]);
      prisma.execution.count.mockResolvedValue(100);

      await service.findAll('user-1', { skip: 20, take: 10 });

      expect(prisma.execution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should filter by workflowId', async () => {
      prisma.execution.findMany.mockResolvedValue([]);
      prisma.execution.count.mockResolvedValue(0);

      await service.findAll('user-1', { workflowId: 'workflow-1' });

      expect(prisma.execution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workflowId: 'workflow-1' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.execution.findMany.mockResolvedValue([]);
      prisma.execution.count.mockResolvedValue(0);

      await service.findAll('user-1', { status: 'SUCCESS' });

      expect(prisma.execution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SUCCESS' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      prisma.execution.findMany.mockResolvedValue([]);
      prisma.execution.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        startedAfter: '2024-01-01T00:00:00Z',
        startedBefore: '2024-12-31T23:59:59Z',
      });

      expect(prisma.execution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startedAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockExecutionWithDetails = {
      ...mockExecution,
      steps: [{ id: 'step-1', nodeId: 'trigger', status: 'success' }],
      workflow: { name: 'Test Workflow' },
    };

    it('should return execution with step logs', async () => {
      prisma.execution.findFirst.mockResolvedValue(mockExecutionWithDetails);

      const result = await service.findOne('execution-1', 'user-1');

      expect(result).toEqual(mockExecutionWithDetails);
      expect(prisma.execution.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'execution-1',
          workflow: { userId: 'user-1' },
        },
        include: {
          steps: { orderBy: { createdAt: 'asc' } },
          workflow: { select: { name: true } },
        },
      });
    });

    it('should throw NotFoundException for non-existent execution', async () => {
      prisma.execution.findFirst.mockResolvedValue(null);

      await expect(service.findOne('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for execution from different user', async () => {
      prisma.execution.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('execution-1', 'wrong-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStepLogs', () => {
    const mockStepLogs = [
      { id: 'log-1', nodeId: 'trigger', status: 'success' },
      { id: 'log-2', nodeId: 'action1', status: 'success' },
    ];

    it('should return step logs for execution', async () => {
      prisma.execution.findFirst.mockResolvedValue(mockExecution);
      prisma.stepLog.findMany.mockResolvedValue(mockStepLogs);

      const result = await service.getStepLogs('execution-1', 'user-1');

      expect(result).toEqual(mockStepLogs);
      expect(prisma.stepLog.findMany).toHaveBeenCalledWith({
        where: { executionId: 'execution-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException for non-existent execution', async () => {
      prisma.execution.findFirst.mockResolvedValue(null);

      await expect(service.getStepLogs('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('replay', () => {
    const mockExecutionWithDetails = {
      ...mockExecution,
      steps: [],
      workflow: { name: 'Test Workflow' },
    };

    it('should create new execution with same input', async () => {
      prisma.execution.findFirst.mockResolvedValue(mockExecutionWithDetails);
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      prisma.execution.create.mockResolvedValue({
        ...mockExecution,
        id: 'execution-2',
      });
      queue.add.mockResolvedValue({ id: 'job-2' });

      const result = await service.replay('execution-1', 'user-1');

      expect(result.id).toBe('execution-2');
      expect(prisma.execution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workflowId: 'workflow-1',
          input: { test: true },
        }),
      });
    });

    it('should throw NotFoundException for non-existent execution', async () => {
      prisma.execution.findFirst.mockResolvedValue(null);

      await expect(service.replay('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', async () => {
      prisma.execution.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // success
        .mockResolvedValueOnce(10) // failed
        .mockResolvedValueOnce(5) // running
        .mockResolvedValueOnce(5); // pending

      prisma.execution.findMany.mockResolvedValue([
        {
          startedAt: new Date('2024-01-01T00:00:00Z'),
          finishedAt: new Date('2024-01-01T00:00:10Z'),
        },
        {
          startedAt: new Date('2024-01-01T00:00:00Z'),
          finishedAt: new Date('2024-01-01T00:00:20Z'),
        },
      ]);

      const result = await service.getStats('user-1');

      expect(result).toEqual({
        total: 100,
        success: 80,
        failed: 10,
        running: 5,
        pending: 5,
        averageDuration: 15000, // Average of 10s and 20s
      });
    });

    it('should filter stats by workflowId', async () => {
      prisma.execution.count.mockResolvedValue(0);
      prisma.execution.findMany.mockResolvedValue([]);

      await service.getStats('user-1', 'workflow-1');

      expect(prisma.execution.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ workflowId: 'workflow-1' }),
      });
    });

    it('should return undefined averageDuration when no completed executions', async () => {
      prisma.execution.count.mockResolvedValue(0);
      prisma.execution.findMany.mockResolvedValue([]);

      const result = await service.getStats('user-1');

      expect(result.averageDuration).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('should cancel pending execution', async () => {
      const pendingExecution = {
        ...mockExecution,
        status: 'PENDING',
        steps: [],
        workflow: { name: 'Test Workflow' },
      };
      const mockJob = { remove: jest.fn() };

      prisma.execution.findFirst.mockResolvedValue(pendingExecution);
      queue.getJob.mockResolvedValue(mockJob);
      prisma.execution.update.mockResolvedValue({
        ...pendingExecution,
        status: 'FAILED',
        error: 'Execution cancelled by user',
      });

      const result = await service.cancel('execution-1', 'user-1');

      expect(result.status).toBe('FAILED');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(prisma.execution.update).toHaveBeenCalledWith({
        where: { id: 'execution-1' },
        data: {
          status: 'FAILED',
          error: 'Execution cancelled by user',
          finishedAt: expect.any(Date),
        },
      });
    });

    it('should cancel running execution', async () => {
      const runningExecution = {
        ...mockExecution,
        status: 'RUNNING',
        steps: [],
        workflow: { name: 'Test Workflow' },
      };

      prisma.execution.findFirst.mockResolvedValue(runningExecution);
      queue.getJob.mockResolvedValue(null);
      prisma.execution.update.mockResolvedValue({
        ...runningExecution,
        status: 'FAILED',
      });

      await service.cancel('execution-1', 'user-1');

      expect(prisma.execution.update).toHaveBeenCalled();
    });

    it('should throw error for completed execution', async () => {
      const completedExecution = {
        ...mockExecution,
        status: 'SUCCESS',
        steps: [],
        workflow: { name: 'Test Workflow' },
      };

      prisma.execution.findFirst.mockResolvedValue(completedExecution);

      await expect(service.cancel('execution-1', 'user-1')).rejects.toThrow(
        'Can only cancel pending or running executions',
      );
    });

    it('should throw error for failed execution', async () => {
      const failedExecution = {
        ...mockExecution,
        status: 'FAILED',
        steps: [],
        workflow: { name: 'Test Workflow' },
      };

      prisma.execution.findFirst.mockResolvedValue(failedExecution);

      await expect(service.cancel('execution-1', 'user-1')).rejects.toThrow(
        'Can only cancel pending or running executions',
      );
    });

    it('should throw NotFoundException for non-existent execution', async () => {
      prisma.execution.findFirst.mockResolvedValue(null);

      await expect(service.cancel('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
