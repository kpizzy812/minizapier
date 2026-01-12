import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { TemplatesController } from './templates.controller';
import { WorkflowsService } from './workflows.service';
import { ExecutionsModule } from '../executions/executions.module';
import { TriggersModule } from '../triggers/triggers.module';

@Module({
  imports: [ExecutionsModule, TriggersModule],
  controllers: [WorkflowsController, TemplatesController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
