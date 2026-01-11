import { Module, forwardRef } from '@nestjs/common';
import { TriggersController } from './triggers.controller';
import { WebhooksController } from './webhooks.controller';
import { TriggersService } from './triggers.service';
import {
  WebhookTriggerService,
  ScheduleTriggerService,
  EmailTriggerService,
} from './services';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ExecutionsModule } from '../executions/executions.module';

/**
 * Triggers Module - manages workflow triggers
 * - Webhook triggers: unique URLs for external HTTP requests
 * - Schedule triggers: cron-based execution via BullMQ
 * - Email triggers: inbound email webhooks from providers
 */
@Module({
  imports: [PrismaModule, QueueModule, forwardRef(() => ExecutionsModule)],
  controllers: [TriggersController, WebhooksController],
  providers: [
    TriggersService,
    WebhookTriggerService,
    ScheduleTriggerService,
    EmailTriggerService,
  ],
  exports: [
    TriggersService,
    WebhookTriggerService,
    ScheduleTriggerService,
    EmailTriggerService,
  ],
})
export class TriggersModule {}
