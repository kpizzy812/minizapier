import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    workflow: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
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

import { WorkflowsService } from './workflows.service';
import { PrismaService } from '../../prisma/prisma.service';

// Workflow type definition for tests
interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string | null | undefined;
  definition: unknown;
  sampleData: unknown;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mock workflow data
const mockWorkflow: Workflow = {
  id: 'workflow-1',
  userId: 'user-1',
  name: 'Test Workflow',
  description: 'Test Description',
  definition: {
    nodes: [
      {
        id: 'node-1',
        type: 'webhookTrigger',
        position: { x: 0, y: 0 },
        data: {},
      },
    ],
    edges: [],
  },
  sampleData: null,
  isActive: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockWorkflowWithRelations = {
  ...mockWorkflow,
  trigger: null,
  _count: { executions: 0 },
};

// Mock Prisma Service
const mockPrismaService = {
  workflow: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    prisma = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a workflow', async () => {
      prisma.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.create('user-1', {
        name: 'Test Workflow',
        description: 'Test Description',
        definition: mockWorkflow.definition as {
          nodes: Array<{
            id: string;
            type: string;
            position: { x: number; y: number };
            data: Record<string, unknown>;
          }>;
          edges: Array<{ id: string; source: string; target: string }>;
        },
      });

      expect(result).toEqual(mockWorkflow);
      expect(prisma.workflow.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Test Workflow',
          description: 'Test Description',
          definition: mockWorkflow.definition,
        },
      });
    });

    it('should create workflow without description', async () => {
      const workflowWithoutDescription = {
        ...mockWorkflow,
        description: undefined,
      };
      prisma.workflow.create.mockResolvedValue(workflowWithoutDescription);

      const result = await service.create('user-1', {
        name: 'Test Workflow',
        definition: mockWorkflow.definition as {
          nodes: Array<{
            id: string;
            type: string;
            position: { x: number; y: number };
            data: Record<string, unknown>;
          }>;
          edges: Array<{ id: string; source: string; target: string }>;
        },
      });

      expect(result.description).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return workflows and total count', async () => {
      prisma.workflow.findMany.mockResolvedValue([mockWorkflowWithRelations]);
      prisma.workflow.count.mockResolvedValue(1);

      const result = await service.findAll('user-1');

      expect(result).toEqual({
        workflows: [mockWorkflowWithRelations],
        total: 1,
      });
      expect(prisma.workflow.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          trigger: true,
          _count: { select: { executions: true } },
        },
      });
    });

    it('should support pagination', async () => {
      prisma.workflow.findMany.mockResolvedValue([]);
      prisma.workflow.count.mockResolvedValue(100);

      await service.findAll('user-1', { skip: 20, take: 10 });

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should support custom ordering', async () => {
      prisma.workflow.findMany.mockResolvedValue([]);
      prisma.workflow.count.mockResolvedValue(0);

      await service.findAll('user-1', { orderBy: { name: 'asc' } });

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a workflow by id', async () => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflowWithRelations);

      const result = await service.findOne('workflow-1', 'user-1');

      expect(result).toEqual(mockWorkflowWithRelations);
      expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
        where: { id: 'workflow-1', userId: 'user-1' },
        include: { trigger: true },
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.findOne('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for wrong user', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.findOne('workflow-1', 'wrong-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflowWithRelations);
    });

    it('should update workflow name', async () => {
      const updatedWorkflow = { ...mockWorkflow, name: 'Updated Name' };
      prisma.workflow.update.mockResolvedValue(updatedWorkflow);

      const result = await service.update('workflow-1', 'user-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update workflow description', async () => {
      const updatedWorkflow = { ...mockWorkflow, description: 'New Desc' };
      prisma.workflow.update.mockResolvedValue(updatedWorkflow);

      await service.update('workflow-1', 'user-1', {
        description: 'New Desc',
      });

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { description: 'New Desc' },
      });
    });

    it('should increment version when definition changes', async () => {
      const newDefinition = {
        nodes: [
          {
            id: 'new-node',
            type: 'action',
            position: { x: 100, y: 100 },
            data: {},
          },
        ],
        edges: [],
      };
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        definition: newDefinition,
        version: 2,
      });

      await service.update('workflow-1', 'user-1', {
        definition: newDefinition,
      });

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: {
          definition: newDefinition,
          version: { increment: 1 },
        },
      });
    });

    it('should update isActive status', async () => {
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        isActive: true,
      });

      await service.update('workflow-1', 'user-1', { isActive: true });

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.update('not-found', 'user-1', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflowWithRelations);
      prisma.workflow.delete.mockResolvedValue(mockWorkflow);

      const result = await service.remove('workflow-1', 'user-1');

      expect(result).toEqual(mockWorkflow);
      expect(prisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
      });
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.remove('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('duplicate', () => {
    it('should create a copy of the workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflowWithRelations);
      const duplicatedWorkflow = {
        ...mockWorkflow,
        id: 'workflow-2',
        name: 'Test Workflow (Copy)',
      };
      prisma.workflow.create.mockResolvedValue(duplicatedWorkflow);

      const result = await service.duplicate('workflow-1', 'user-1');

      expect(result.name).toBe('Test Workflow (Copy)');
      expect(prisma.workflow.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Test Workflow (Copy)',
          description: mockWorkflow.description,
          definition: mockWorkflow.definition,
        },
      });
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.duplicate('not-found', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setActive', () => {
    beforeEach(() => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflowWithRelations);
    });

    it('should activate a workflow', async () => {
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        isActive: true,
      });

      const result = await service.setActive('workflow-1', 'user-1', true);

      expect(result.isActive).toBe(true);
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { isActive: true },
      });
    });

    it('should deactivate a workflow', async () => {
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        isActive: false,
      });

      const result = await service.setActive('workflow-1', 'user-1', false);

      expect(result.isActive).toBe(false);
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.setActive('not-found', 'user-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSampleData', () => {
    beforeEach(() => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflowWithRelations);
    });

    it('should update sample data', async () => {
      const sampleData = { foo: 'bar', count: 42 };
      prisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        sampleData,
      });

      const result = await service.updateSampleData(
        'workflow-1',
        'user-1',
        sampleData,
      );

      expect(result.sampleData).toEqual(sampleData);
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { sampleData },
      });
    });

    it('should throw NotFoundException for non-existent workflow', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSampleData('not-found', 'user-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
