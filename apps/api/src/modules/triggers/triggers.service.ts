import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Trigger,
  TriggerType as PrismaTriggerType,
  Prisma,
} from '../../../generated/prisma/client';
import {
  CreateTriggerDto,
  UpdateTriggerDto,
  TriggerResponseDto,
  TriggerType,
  ScheduleConfigDto,
  WebhookConfigDto,
  EmailConfigDto,
} from './dto/triggers.dto';
import { WebhookTriggerService } from './services/webhook-trigger.service';
import { ScheduleTriggerService } from './services/schedule-trigger.service';
import { EmailTriggerService } from './services/email-trigger.service';

@Injectable()
export class TriggersService {
  private readonly logger = new Logger(TriggersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookTrigger: WebhookTriggerService,
    private readonly scheduleTrigger: ScheduleTriggerService,
    private readonly emailTrigger: EmailTriggerService,
  ) {}

  /**
   * Create a new trigger for a workflow.
   * Each workflow can have only one trigger.
   */
  async create(
    userId: string,
    dto: CreateTriggerDto,
  ): Promise<TriggerResponseDto> {
    // Verify workflow exists and belongs to user
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: dto.workflowId, userId },
      include: { trigger: true },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${dto.workflowId} not found`);
    }

    // Check if workflow already has a trigger
    if (workflow.trigger) {
      throw new ConflictException(
        `Workflow ${dto.workflowId} already has a trigger. Delete the existing trigger first.`,
      );
    }

    // Validate and prepare type-specific data
    const triggerData = this.prepareTriggerData(dto, userId);

    // Create trigger in database
    const trigger = await this.prisma.trigger.create({
      data: {
        type: dto.type as PrismaTriggerType,
        config: triggerData.config as Prisma.InputJsonValue,
        webhookUrl: triggerData.webhookUrl,
        workflowId: dto.workflowId,
      },
    });

    // If schedule trigger, set up BullMQ job
    if (dto.type === TriggerType.SCHEDULE) {
      const config = dto.config as ScheduleConfigDto;
      await this.scheduleTrigger.createSchedule(
        trigger.id,
        dto.workflowId,
        userId,
        config.cron,
        config.timezone,
      );
    }

    this.logger.log(
      `Created ${dto.type} trigger ${trigger.id} for workflow ${dto.workflowId}`,
    );

    return this.toResponseDto(trigger);
  }

  /**
   * Find trigger by workflow ID.
   */
  async findByWorkflowId(
    workflowId: string,
    userId: string,
  ): Promise<TriggerResponseDto | null> {
    // Verify workflow belongs to user
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: { trigger: true },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    if (!workflow.trigger) {
      return null;
    }

    return this.toResponseDto(workflow.trigger);
  }

  /**
   * Find trigger by workflow ID (safe version - returns null instead of throwing).
   * Used when we already verified workflow ownership.
   */
  async findByWorkflowIdSafe(
    workflowId: string,
    userId: string,
  ): Promise<TriggerResponseDto | null> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: { trigger: true },
    });

    if (!workflow || !workflow.trigger) {
      return null;
    }

    return this.toResponseDto(workflow.trigger);
  }

  /**
   * Find trigger by ID.
   */
  async findOne(id: string, userId: string): Promise<TriggerResponseDto> {
    const trigger = await this.prisma.trigger.findFirst({
      where: { id },
      include: {
        workflow: {
          select: { userId: true },
        },
      },
    });

    if (!trigger || trigger.workflow.userId !== userId) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    return this.toResponseDto(trigger);
  }

  /**
   * Find trigger by webhook URL/token.
   * Used by webhook controller to resolve incoming requests.
   */
  async findByWebhookToken(token: string): Promise<{
    trigger: Trigger;
    workflow: {
      id: string;
      userId: string;
      definition: unknown;
      isActive: boolean;
    };
  } | null> {
    const trigger = await this.prisma.trigger.findFirst({
      where: {
        webhookUrl: {
          endsWith: `/${token}`,
        },
        type: 'WEBHOOK',
      },
      include: {
        workflow: {
          select: {
            id: true,
            userId: true,
            definition: true,
            isActive: true,
          },
        },
      },
    });

    if (!trigger) {
      return null;
    }

    return {
      trigger,
      workflow: trigger.workflow,
    };
  }

  /**
   * Find trigger by email address.
   * Used by email webhook controller.
   */
  async findByEmailAddress(address: string): Promise<{
    trigger: Trigger;
    workflow: {
      id: string;
      userId: string;
      definition: unknown;
      isActive: boolean;
    };
  } | null> {
    const trigger = await this.prisma.trigger.findFirst({
      where: {
        type: 'EMAIL',
        config: {
          path: ['address'],
          equals: address,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            userId: true,
            definition: true,
            isActive: true,
          },
        },
      },
    });

    if (!trigger) {
      return null;
    }

    return {
      trigger,
      workflow: trigger.workflow,
    };
  }

  /**
   * Update a trigger.
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateTriggerDto,
  ): Promise<TriggerResponseDto> {
    // Find existing trigger
    const existingTrigger = await this.prisma.trigger.findFirst({
      where: { id },
      include: {
        workflow: {
          select: { userId: true },
        },
      },
    });

    if (!existingTrigger || existingTrigger.workflow.userId !== userId) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    const updateData: Prisma.TriggerUpdateInput = {};

    if (dto.config) {
      // Merge with existing config
      const existingConfig = existingTrigger.config as Record<string, unknown>;
      const newConfig = { ...existingConfig, ...dto.config };
      updateData.config = newConfig as Prisma.InputJsonValue;

      // If schedule trigger and cron changed, update BullMQ
      if (existingTrigger.type === 'SCHEDULE' && 'cron' in dto.config) {
        const config = dto.config;
        if (!this.scheduleTrigger.validateCron(config.cron)) {
          throw new BadRequestException('Invalid cron expression');
        }
        await this.scheduleTrigger.updateSchedule(
          id,
          existingTrigger.workflowId,
          userId,
          config.cron,
          config.timezone,
        );
      }
    }

    const trigger = await this.prisma.trigger.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated trigger ${id}`);

    return this.toResponseDto(trigger);
  }

  /**
   * Delete a trigger.
   */
  async remove(id: string, userId: string): Promise<void> {
    const trigger = await this.prisma.trigger.findFirst({
      where: { id },
      include: {
        workflow: {
          select: { userId: true },
        },
      },
    });

    if (!trigger || trigger.workflow.userId !== userId) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    // Remove schedule job if applicable
    if (trigger.type === 'SCHEDULE') {
      await this.scheduleTrigger.removeSchedule(id);
    }

    await this.prisma.trigger.delete({
      where: { id },
    });

    this.logger.log(`Deleted trigger ${id}`);
  }

  /**
   * Activate a trigger (for schedule triggers).
   */
  async activate(id: string, userId: string): Promise<TriggerResponseDto> {
    const trigger = await this.prisma.trigger.findFirst({
      where: { id },
      include: {
        workflow: {
          select: { userId: true },
        },
      },
    });

    if (!trigger || trigger.workflow.userId !== userId) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    if (trigger.type === 'SCHEDULE') {
      await this.scheduleTrigger.resumeSchedule(id);
    }

    // Also activate the workflow
    await this.prisma.workflow.update({
      where: { id: trigger.workflowId },
      data: { isActive: true },
    });

    return this.toResponseDto(trigger);
  }

  /**
   * Deactivate a trigger (for schedule triggers).
   */
  async deactivate(id: string, userId: string): Promise<TriggerResponseDto> {
    const trigger = await this.prisma.trigger.findFirst({
      where: { id },
      include: {
        workflow: {
          select: { userId: true },
        },
      },
    });

    if (!trigger || trigger.workflow.userId !== userId) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    if (trigger.type === 'SCHEDULE') {
      await this.scheduleTrigger.pauseSchedule(id);
    }

    // Also deactivate the workflow
    await this.prisma.workflow.update({
      where: { id: trigger.workflowId },
      data: { isActive: false },
    });

    return this.toResponseDto(trigger);
  }

  /**
   * Regenerate webhook URL for a webhook trigger.
   */
  async regenerateWebhookUrl(
    id: string,
    userId: string,
  ): Promise<TriggerResponseDto> {
    const trigger = await this.prisma.trigger.findFirst({
      where: { id },
      include: {
        workflow: {
          select: { userId: true },
        },
      },
    });

    if (!trigger || trigger.workflow.userId !== userId) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    if (trigger.type !== 'WEBHOOK') {
      throw new BadRequestException('Only webhook triggers have URLs');
    }

    const newToken = this.webhookTrigger.generateWebhookToken();
    const newUrl = this.webhookTrigger.generateWebhookUrl(newToken);

    const updated = await this.prisma.trigger.update({
      where: { id },
      data: { webhookUrl: newUrl },
    });

    this.logger.log(`Regenerated webhook URL for trigger ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * Get webhook signature for testing.
   */
  getWebhookSignature(_payload: string, _triggerId: string): string | null {
    // This would need to fetch the trigger's secret
    // For now, return null - implement if needed
    return null;
  }

  /**
   * Prepare trigger data based on type.
   */
  private prepareTriggerData(
    dto: CreateTriggerDto,
    _userId: string,
  ): {
    config: Record<string, unknown>;
    webhookUrl?: string;
  } {
    switch (dto.type) {
      case TriggerType.WEBHOOK: {
        const config = dto.config as WebhookConfigDto;
        const token = this.webhookTrigger.generateWebhookToken();
        const webhookUrl = this.webhookTrigger.generateWebhookUrl(token);

        return {
          config: {
            secret: config.secret || this.webhookTrigger.generateSecret(),
          },
          webhookUrl,
        };
      }

      case TriggerType.SCHEDULE: {
        const config = dto.config as ScheduleConfigDto;

        if (!this.scheduleTrigger.validateCron(config.cron)) {
          throw new BadRequestException(
            `Invalid cron expression: ${config.cron}`,
          );
        }

        return {
          config: {
            cron: config.cron,
            timezone: config.timezone || 'UTC',
          },
        };
      }

      case TriggerType.EMAIL: {
        const config = dto.config as EmailConfigDto;
        const address =
          config.address || this.emailTrigger.generateEmailAddress();

        return {
          config: {
            address,
          },
        };
      }

      default: {
        const exhaustiveCheck: never = dto.type;
        throw new BadRequestException(
          `Unknown trigger type: ${exhaustiveCheck as string}`,
        );
      }
    }
  }

  /**
   * Convert Prisma model to response DTO.
   */
  private toResponseDto(trigger: Trigger): TriggerResponseDto {
    return {
      id: trigger.id,
      type: trigger.type as TriggerType,
      config: trigger.config as Record<string, unknown>,
      webhookUrl: trigger.webhookUrl || undefined,
      workflowId: trigger.workflowId,
    };
  }
}
