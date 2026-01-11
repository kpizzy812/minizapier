import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CronExpressionParser } from 'cron-parser';
import { PrismaService } from '../../../prisma/prisma.service';
import { WORKFLOW_QUEUE } from '../../queue/queue.constants';

// Schedule trigger queue name
export const SCHEDULE_TRIGGER_QUEUE = 'schedule-triggers';

/**
 * Schedule trigger job data
 */
export interface ScheduleJobData {
  triggerId: string;
  workflowId: string;
  userId: string;
}

/**
 * Service for managing scheduled triggers using BullMQ repeatable jobs.
 * Handles cron-based workflow execution.
 */
@Injectable()
export class ScheduleTriggerService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleTriggerService.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE) private readonly workflowQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * On module init, restore all active schedule triggers.
   */
  async onModuleInit(): Promise<void> {
    await this.restoreScheduleTriggers();
  }

  /**
   * Create a new schedule trigger with cron pattern.
   *
   * @param triggerId - The trigger ID (used as job scheduler key)
   * @param workflowId - The workflow to execute
   * @param userId - The owner of the workflow
   * @param cron - Cron expression (6 fields)
   * @param timezone - Optional timezone
   */
  async createSchedule(
    triggerId: string,
    workflowId: string,
    userId: string,
    cron: string,
    timezone?: string,
  ): Promise<void> {
    this.logger.log(
      `Creating schedule trigger ${triggerId} with cron: ${cron}`,
    );

    const jobSchedulerKey = this.getJobSchedulerKey(triggerId);

    // Remove existing scheduler if any
    await this.removeSchedule(triggerId);

    // Create new repeatable job scheduler
    await this.workflowQueue.upsertJobScheduler(
      jobSchedulerKey,
      {
        pattern: cron,
        tz: timezone,
      },
      {
        name: 'scheduled-execution',
        data: {
          triggerId,
          workflowId,
          userId,
          isScheduled: true,
        },
        opts: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      },
    );

    this.logger.log(`Schedule trigger ${triggerId} created successfully`);
  }

  /**
   * Update an existing schedule trigger.
   *
   * @param triggerId - The trigger ID
   * @param workflowId - The workflow to execute
   * @param userId - The owner of the workflow
   * @param cron - New cron expression
   * @param timezone - Optional timezone
   */
  async updateSchedule(
    triggerId: string,
    workflowId: string,
    userId: string,
    cron: string,
    timezone?: string,
  ): Promise<void> {
    // Simply recreate the schedule (upsert handles this)
    await this.createSchedule(triggerId, workflowId, userId, cron, timezone);
  }

  /**
   * Remove a schedule trigger.
   *
   * @param triggerId - The trigger ID
   */
  async removeSchedule(triggerId: string): Promise<boolean> {
    const jobSchedulerKey = this.getJobSchedulerKey(triggerId);

    try {
      const result =
        await this.workflowQueue.removeJobScheduler(jobSchedulerKey);
      if (result) {
        this.logger.log(`Schedule trigger ${triggerId} removed`);
      }
      return result;
    } catch (error) {
      this.logger.warn(`Failed to remove schedule ${triggerId}`, error);
      return false;
    }
  }

  /**
   * Pause a schedule trigger (remove from BullMQ but keep in DB).
   */
  async pauseSchedule(triggerId: string): Promise<boolean> {
    return this.removeSchedule(triggerId);
  }

  /**
   * Resume a paused schedule trigger.
   */
  async resumeSchedule(triggerId: string): Promise<boolean> {
    const trigger = await this.prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { workflow: true },
    });

    if (!trigger || trigger.type !== 'SCHEDULE') {
      return false;
    }

    const config = trigger.config as { cron: string; timezone?: string };

    await this.createSchedule(
      triggerId,
      trigger.workflowId,
      trigger.workflow.userId,
      config.cron,
      config.timezone,
    );

    return true;
  }

  /**
   * Get all active job schedulers.
   */
  async getActiveSchedulers(): Promise<string[]> {
    const schedulers = await this.workflowQueue.getJobSchedulers();
    return schedulers
      .filter((s) => s.id && s.id.startsWith('schedule-trigger:'))
      .map((s) => s.id!.replace('schedule-trigger:', ''));
  }

  /**
   * Validate cron expression.
   * Returns true if valid, false otherwise.
   */
  validateCron(cron: string): boolean {
    // BullMQ uses cron-parser which supports 6 fields
    // Format: second minute hour day month weekday
    // Pattern allows: *, */N, ranges (1-5), lists (1,2,3), or combinations
    const cronField = '(\\*(?:/\\d+)?|[0-9,\\-/]+)';
    const cronRegex = new RegExp(
      `^${cronField}\\s+${cronField}\\s+${cronField}\\s+${cronField}\\s+${cronField}\\s+${cronField}$`,
    );

    if (!cronRegex.test(cron)) {
      return false;
    }

    // Additional validation using cron-parser
    try {
      CronExpressionParser.parse(cron);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get next execution time for a cron expression.
   */
  getNextExecutionTime(cron: string, timezone?: string): Date | null {
    try {
      const expression = CronExpressionParser.parse(cron, { tz: timezone });
      return expression.next().toDate();
    } catch {
      return null;
    }
  }

  /**
   * Build trigger data for scheduled execution.
   */
  buildScheduleTriggerData(): Record<string, unknown> {
    return {
      type: 'schedule',
      timestamp: new Date().toISOString(),
      scheduledAt: new Date().toISOString(),
    };
  }

  /**
   * Restore all active schedule triggers from database.
   * Called on module initialization.
   */
  private async restoreScheduleTriggers(): Promise<void> {
    this.logger.log('Restoring schedule triggers...');

    try {
      const scheduleTriggers = await this.prisma.trigger.findMany({
        where: { type: 'SCHEDULE' },
        include: {
          workflow: {
            select: { userId: true, isActive: true },
          },
        },
      });

      let restored = 0;
      let skipped = 0;

      for (const trigger of scheduleTriggers) {
        // Only restore if workflow is active
        if (!trigger.workflow.isActive) {
          skipped++;
          continue;
        }

        const config = trigger.config as { cron: string; timezone?: string };

        if (config.cron) {
          try {
            await this.createSchedule(
              trigger.id,
              trigger.workflowId,
              trigger.workflow.userId,
              config.cron,
              config.timezone,
            );
            restored++;
          } catch (error) {
            this.logger.error(
              `Failed to restore schedule trigger ${trigger.id}`,
              error,
            );
          }
        }
      }

      this.logger.log(
        `Schedule triggers restored: ${restored}, skipped (inactive): ${skipped}`,
      );
    } catch (error) {
      this.logger.error('Failed to restore schedule triggers', error);
    }
  }

  /**
   * Get job scheduler key for a trigger ID.
   */
  private getJobSchedulerKey(triggerId: string): string {
    return `schedule-trigger:${triggerId}`;
  }
}
