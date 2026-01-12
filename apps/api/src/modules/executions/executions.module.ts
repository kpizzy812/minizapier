import { Module, forwardRef } from '@nestjs/common';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { ExecutionGateway } from './execution.gateway';
import { ExecutionEventsService } from './execution-events.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, forwardRef(() => QueueModule)],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionGateway, ExecutionEventsService],
  exports: [ExecutionsService, ExecutionEventsService],
})
export class ExecutionsModule {}
