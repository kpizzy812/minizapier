import { Module, Global } from '@nestjs/common';
import {
  HttpRequestAction,
  TransformAction,
  SendEmailAction,
  SendTelegramAction,
  DatabaseQueryAction,
  AIRequestAction,
} from './services';
import { AIController } from './ai.controller';

/**
 * Actions Module - provides all workflow action executors
 * Global module so actions can be used anywhere without importing
 */
@Global()
@Module({
  controllers: [AIController],
  providers: [
    HttpRequestAction,
    TransformAction,
    SendEmailAction,
    SendTelegramAction,
    DatabaseQueryAction,
    AIRequestAction,
  ],
  exports: [
    HttpRequestAction,
    TransformAction,
    SendEmailAction,
    SendTelegramAction,
    DatabaseQueryAction,
    AIRequestAction,
  ],
})
export class ActionsModule {}
