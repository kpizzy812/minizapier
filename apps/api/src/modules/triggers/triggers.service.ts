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
   * Sync trigger from workflow definition.
   * Automatically creates/updates trigger based on trigger node in definition.
   * Called when workflow is saved.
   */
  async syncTriggerFromDefinition(
    workflowId: string,
    userId: string,
    definition: {
      nodes: Array<{
        id: string;
        type: string;
        data?: Record<string, unknown>;
      }>;
    },
  ): Promise<void> {
    // Find trigger node in definition
    const triggerNode = definition.nodes?.find((node) =>
      ['webhookTrigger', 'emailTrigger', 'scheduleTrigger'].includes(node.type),
    );

    // Get existing trigger
    const existingTrigger = await this.prisma.trigger.findFirst({
      where: { workflowId },
    });

    // No trigger node in definition - remove existing trigger if any
    if (!triggerNode) {
      if (existingTrigger) {
        if (existingTrigger.type === 'SCHEDULE') {
          await this.scheduleTrigger.removeSchedule(existingTrigger.id);
        }
        await this.prisma.trigger.delete({ where: { id: existingTrigger.id } });
        this.logger.log(
          `Removed trigger for workflow ${workflowId} (no trigger node)`,
        );
      }
      return;
    }

    // Map node type to trigger type
    const typeMap: Record<string, TriggerType> = {
      webhookTrigger: TriggerType.WEBHOOK,
      emailTrigger: TriggerType.EMAIL,
      scheduleTrigger: TriggerType.SCHEDULE,
    };
    const triggerType = typeMap[triggerNode.type];

    if (!triggerType) {
      return;
    }

    // If existing trigger has different type - delete it first
    if (existingTrigger && existingTrigger.type !== triggerType) {
      if (existingTrigger.type === 'SCHEDULE') {
        await this.scheduleTrigger.removeSchedule(existingTrigger.id);
      }
      await this.prisma.trigger.delete({ where: { id: existingTrigger.id } });
      this.logger.log(
        `Deleted old ${existingTrigger.type} trigger for workflow ${workflowId}`,
      );
    }

    // Create or update trigger
    if (!existingTrigger || existingTrigger.type !== triggerType) {
      // Build config from node data
      const config = this.buildConfigFromNode(
        triggerType,
        triggerNode.data || {},
      );

      await this.create(userId, {
        workflowId,
        type: triggerType,
        config,
      });
      this.logger.log(
        `Created ${triggerType} trigger for workflow ${workflowId}`,
      );
    }
  }

  /**
   * Build trigger config from node data.
   */
  private buildConfigFromNode(
    type: TriggerType,
    nodeData: Record<string, unknown>,
  ): WebhookConfigDto | ScheduleConfigDto | EmailConfigDto {
    switch (type) {
      case TriggerType.WEBHOOK:
        return {
          secret: nodeData.secret as string | undefined,
          webhookUrl: nodeData.webhookUrl as string | undefined,
        };
      case TriggerType.EMAIL:
        return {
          address: nodeData.address as string | undefined,
        };
      case TriggerType.SCHEDULE:
        return {
          cron: (nodeData.cron as string) || '0 0 9 * * *',
          timezone: (nodeData.timezone as string) || 'UTC',
        };
      default:
        return {};
    }
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
        // Use webhookUrl from config if provided (pre-generated on frontend), otherwise generate new
        let webhookUrl = config.webhookUrl;
        if (!webhookUrl) {
          const token = this.webhookTrigger.generateWebhookToken();
          webhookUrl = this.webhookTrigger.generateWebhookUrl(token);
        }

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
