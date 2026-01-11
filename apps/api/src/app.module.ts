import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { QueueModule } from './modules/queue/queue.module';
import { ActionsModule } from './modules/actions/actions.module';
import { CredentialsModule } from './modules/credentials/credentials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QueueModule,
    ActionsModule,
    CredentialsModule,
    WorkflowsModule,
    ExecutionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
