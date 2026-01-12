import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WORKFLOW_QUEUE } from './queue.constants';
import { WorkflowProcessor } from './workflow.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  TemplateResolverService,
  ConditionEvaluatorService,
  GraphTraverserService,
  StepExecutorService,
} from './services';
import { ActionsModule } from '../actions/actions.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { NotificationsModule } from '../notifications';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('REDIS_PASSWORD');
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            ...(password && { password }),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: WORKFLOW_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }),
    PrismaModule,
    ActionsModule,
    CredentialsModule,
    NotificationsModule,
    forwardRef(() => ExecutionsModule),
  ],
  providers: [
    WorkflowProcessor,
    TemplateResolverService,
    ConditionEvaluatorService,
    GraphTraverserService,
    StepExecutorService,
  ],
  exports: [
    BullModule,
    TemplateResolverService,
    ConditionEvaluatorService,
    GraphTraverserService,
    StepExecutorService,
  ],
})
export class QueueModule {}
