/* eslint-disable @typescript-eslint/unbound-method */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: { InputJsonValue: {} },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { ExecutionsService } from '../executions/executions.service';
import { TriggersService } from '../triggers/triggers.service';
import { ScheduleTriggerService } from '../triggers/services';
import { TriggerType } from '../triggers/dto/triggers.dto';

describe('WorkflowsController', () => {
  let controller: WorkflowsController;
  let workflowsService: jest.Mocked<WorkflowsService>;
  let executionsService: jest.Mocked<ExecutionsService>;
  let triggersService: jest.Mocked<TriggersService>;
  let scheduleTriggerService: jest.Mocked<ScheduleTriggerService>;

  const mockWorkflow = {
    id: 'wf-123',
    userId: 'user-123',
    name: 'Test Workflow',
    description: 'Test description',
    definition: { nodes: [], edges: [] },
    sampleData: null,
    isActive: false,
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockExecution = {
    id: 'exec-123',
    workflowId: 'wf-123',
    status: 'PENDING',
    startedAt: new Date(),
    finishedAt: null,
    input: { test: true },
    output: null,
    error: null,
  };

  beforeEach(async () => {
    const mockWorkflowsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      duplicate: jest.fn(),
      setActive: jest.fn(),
    };

    const mockExecutionsService = {
      create: jest.fn(),
    };

    const mockTriggersService = {
      findByWorkflowIdSafe: jest.fn(),
    };

    const mockScheduleTriggerService = {
      resumeSchedule: jest.fn(),
      pauseSchedule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowsController],
      providers: [
        { provide: WorkflowsService, useValue: mockWorkflowsService },
        { provide: ExecutionsService, useValue: mockExecutionsService },
        { provide: TriggersService, useValue: mockTriggersService },
        {
          provide: ScheduleTriggerService,
          useValue: mockScheduleTriggerService,
        },
      ],
    }).compile();

    controller = module.get<WorkflowsController>(WorkflowsController);
    workflowsService = module.get(WorkflowsService);
    executionsService = module.get(ExecutionsService);
    triggersService = module.get(TriggersService);
    scheduleTriggerService = module.get(ScheduleTriggerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a workflow', async () => {
      workflowsService.create.mockResolvedValue(mockWorkflow);

      const result = await controller.create('user-123', {
        name: 'Test Workflow',
        description: 'Test description',
        definition: { nodes: [], edges: [] },
      });

      expect(result).toEqual({
        data: mockWorkflow,
        message: 'Workflow created successfully',
      });
      expect(workflowsService.create).toHaveBeenCalledWith('user-123', {
        name: 'Test Workflow',
        description: 'Test description',
        definition: { nodes: [], edges: [] },
      });
    });
  });

  describe('findAll', () => {
    it('should return all workflows for user', async () => {
      workflowsService.findAll.mockResolvedValue({
        workflows: [mockWorkflow],
        total: 1,
      });

      const result = await controller.findAll('user-123');

      expect(result).toEqual({ data: [mockWorkflow], total: 1 });
      expect(workflowsService.findAll).toHaveBeenCalledWith('user-123', {
        skip: undefined,
        take: undefined,
      });
    });

    it('should support pagination', async () => {
      workflowsService.findAll.mockResolvedValue({
        workflows: [mockWorkflow],
        total: 10,
      });

      const result = await controller.findAll('user-123', '5', '10');

      expect(result).toEqual({ data: [mockWorkflow], total: 10 });
      expect(workflowsService.findAll).toHaveBeenCalledWith('user-123', {
        skip: 5,
        take: 10,
      });
    });

    it('should return empty array when no workflows', async () => {
      workflowsService.findAll.mockResolvedValue({
        workflows: [],
        total: 0,
      });

      const result = await controller.findAll('user-123');

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('should return a workflow by id', async () => {
      workflowsService.findOne.mockResolvedValue(mockWorkflow);

      const result = await controller.findOne('user-123', 'wf-123');

      expect(result).toEqual({ data: mockWorkflow });
      expect(workflowsService.findOne).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
    });

    it('should throw when workflow not found', async () => {
      workflowsService.findOne.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(controller.findOne('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a workflow', async () => {
      const updatedWorkflow = {
        ...mockWorkflow,
        name: 'Updated Name',
      };
      workflowsService.update.mockResolvedValue(updatedWorkflow);

      const result = await controller.update('user-123', 'wf-123', {
        name: 'Updated Name',
      });

      expect(result).toEqual({
        data: updatedWorkflow,
        message: 'Workflow updated successfully',
      });
      expect(workflowsService.update).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
        {
          name: 'Updated Name',
        },
      );
    });

    it('should throw when workflow not found', async () => {
      workflowsService.update.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(
        controller.update('user-123', 'missing', {
          name: 'New',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a workflow', async () => {
      workflowsService.remove.mockResolvedValue(mockWorkflow);

      const result = await controller.remove('user-123', 'wf-123');

      expect(result).toEqual({ message: 'Workflow deleted successfully' });
      expect(workflowsService.remove).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
    });

    it('should throw when workflow not found', async () => {
      workflowsService.remove.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(controller.remove('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('duplicate', () => {
    it('should duplicate a workflow', async () => {
      const duplicatedWorkflow = {
        ...mockWorkflow,
        id: 'wf-456',
        name: 'Test Workflow (Copy)',
      };
      workflowsService.duplicate.mockResolvedValue(duplicatedWorkflow);

      const result = await controller.duplicate('user-123', 'wf-123');

      expect(result).toEqual({
        data: duplicatedWorkflow,
        message: 'Workflow duplicated successfully',
      });
      expect(workflowsService.duplicate).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
    });

    it('should throw when workflow not found', async () => {
      workflowsService.duplicate.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(controller.duplicate('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a workflow without schedule trigger', async () => {
      const activatedWorkflow = { ...mockWorkflow, isActive: true };
      workflowsService.findOne.mockResolvedValue(mockWorkflow);
      triggersService.findByWorkflowIdSafe.mockResolvedValue(null);
      workflowsService.setActive.mockResolvedValue(activatedWorkflow);

      const result = await controller.activate('user-123', 'wf-123');

      expect(result).toEqual({
        data: activatedWorkflow,
        message: 'Workflow activated',
      });
      expect(workflowsService.findOne).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
      expect(triggersService.findByWorkflowIdSafe).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
      expect(scheduleTriggerService.resumeSchedule).not.toHaveBeenCalled();
      expect(workflowsService.setActive).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
        true,
      );
    });

    it('should activate a workflow with schedule trigger', async () => {
      const activatedWorkflow = { ...mockWorkflow, isActive: true };
      const mockTrigger = { id: 'trigger-123', type: TriggerType.SCHEDULE };
      workflowsService.findOne.mockResolvedValue(mockWorkflow);
      triggersService.findByWorkflowIdSafe.mockResolvedValue(mockTrigger);
      scheduleTriggerService.resumeSchedule.mockResolvedValue(true);
      workflowsService.setActive.mockResolvedValue(activatedWorkflow);

      const result = await controller.activate('user-123', 'wf-123');

      expect(result).toEqual({
        data: activatedWorkflow,
        message: 'Workflow activated',
      });
      expect(scheduleTriggerService.resumeSchedule).toHaveBeenCalledWith(
        'trigger-123',
      );
    });

    it('should throw when workflow not found', async () => {
      workflowsService.findOne.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(controller.activate('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a workflow without schedule trigger', async () => {
      const deactivatedWorkflow = { ...mockWorkflow, isActive: false };
      workflowsService.findOne.mockResolvedValue(mockWorkflow);
      triggersService.findByWorkflowIdSafe.mockResolvedValue(null);
      workflowsService.setActive.mockResolvedValue(deactivatedWorkflow);

      const result = await controller.deactivate('user-123', 'wf-123');

      expect(result).toEqual({
        data: deactivatedWorkflow,
        message: 'Workflow deactivated',
      });
      expect(workflowsService.findOne).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
      expect(triggersService.findByWorkflowIdSafe).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
      expect(scheduleTriggerService.pauseSchedule).not.toHaveBeenCalled();
      expect(workflowsService.setActive).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
        false,
      );
    });

    it('should deactivate a workflow with schedule trigger', async () => {
      const deactivatedWorkflow = { ...mockWorkflow, isActive: false };
      const mockTrigger = { id: 'trigger-123', type: TriggerType.SCHEDULE };
      workflowsService.findOne.mockResolvedValue(mockWorkflow);
      triggersService.findByWorkflowIdSafe.mockResolvedValue(mockTrigger);
      scheduleTriggerService.pauseSchedule.mockResolvedValue(true);
      workflowsService.setActive.mockResolvedValue(deactivatedWorkflow);

      const result = await controller.deactivate('user-123', 'wf-123');

      expect(result).toEqual({
        data: deactivatedWorkflow,
        message: 'Workflow deactivated',
      });
      expect(scheduleTriggerService.pauseSchedule).toHaveBeenCalledWith(
        'trigger-123',
      );
    });
  });

  describe('test', () => {
    it('should run a test execution', async () => {
      workflowsService.findOne.mockResolvedValue(mockWorkflow);
      executionsService.create.mockResolvedValue(mockExecution);

      const result = await controller.test('user-123', 'wf-123', {
        testData: { foo: 'bar' },
      });

      expect(result).toEqual({
        data: mockExecution,
        message: 'Test execution started',
      });
      expect(workflowsService.findOne).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
      );
      expect(executionsService.create).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
        { foo: 'bar' },
      );
    });

    it('should use default test data when not provided', async () => {
      workflowsService.findOne.mockResolvedValue(mockWorkflow);
      executionsService.create.mockResolvedValue(mockExecution);

      await controller.test('user-123', 'wf-123');

      expect(executionsService.create).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
        expect.objectContaining({ test: true }),
      );
    });

    it('should throw when workflow not found', async () => {
      workflowsService.findOne.mockRejectedValue(
        new NotFoundException('Workflow not found'),
      );

      await expect(controller.test('user-123', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
