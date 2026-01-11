import { Module, Global } from '@nestjs/common';
import {
  HttpRequestAction,
  TransformAction,
  SendEmailAction,
  SendTelegramAction,
  DatabaseQueryAction,
} from './services';

/**
 * Actions Module - provides all workflow action executors
 * Global module so actions can be used anywhere without importing
 */
@Global()
@Module({
  providers: [
    HttpRequestAction,
    TransformAction,
    SendEmailAction,
    SendTelegramAction,
    DatabaseQueryAction,
  ],
  exports: [
    HttpRequestAction,
    TransformAction,
    SendEmailAction,
    SendTelegramAction,
    DatabaseQueryAction,
  ],
})
export class ActionsModule {}
