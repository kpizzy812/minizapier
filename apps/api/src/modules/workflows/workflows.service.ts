import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Workflow, Prisma } from '../../../generated/prisma/client';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new workflow
   */
  async create(userId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    return this.prisma.workflow.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        definition: dto.definition as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Find all workflows for a user
   */
  async findAll(
    userId: string,
    params: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.WorkflowOrderByWithRelationInput;
    } = {},
  ): Promise<{ workflows: Workflow[]; total: number }> {
    const { skip = 0, take = 20, orderBy = { updatedAt: 'desc' } } = params;

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where: { userId },
        skip,
        take,
        orderBy,
        include: {
          trigger: true,
          _count: {
            select: { executions: true },
          },
        },
      }),
      this.prisma.workflow.count({ where: { userId } }),
    ]);

    return { workflows, total };
  }

  /**
   * Find a single workflow by ID
   */
  async findOne(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, userId },
      include: {
        trigger: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  /**
   * Update a workflow
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    // Check workflow exists and belongs to user
    await this.findOne(id, userId);

    const updateData: Prisma.WorkflowUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.definition !== undefined) {
      updateData.definition =
        dto.definition as unknown as Prisma.InputJsonValue;
      // Increment version on definition change
      updateData.version = { increment: 1 };
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.workflow.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a workflow
   */
  async remove(id: string, userId: string): Promise<Workflow> {
    // Check workflow exists and belongs to user
    await this.findOne(id, userId);

    return this.prisma.workflow.delete({
      where: { id },
    });
  }

  /**
   * Duplicate a workflow
   */
  async duplicate(id: string, userId: string): Promise<Workflow> {
    const original = await this.findOne(id, userId);

    return this.prisma.workflow.create({
      data: {
        userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        definition: original.definition as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Activate/deactivate a workflow
   */
  async setActive(
    id: string,
    userId: string,
    isActive: boolean,
  ): Promise<Workflow> {
    await this.findOne(id, userId);

    return this.prisma.workflow.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Update sample data from test run
   */
  async updateSampleData(
    id: string,
    userId: string,
    sampleData: Record<string, unknown>,
  ): Promise<Workflow> {
    await this.findOne(id, userId);

    return this.prisma.workflow.update({
      where: { id },
      data: { sampleData: sampleData as unknown as Prisma.InputJsonValue },
    });
  }
}
