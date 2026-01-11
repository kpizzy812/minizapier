import { Injectable, Logger } from '@nestjs/common';
import { Api } from 'grammy';
import { SendTelegramConfig, SendTelegramResult } from '../types';

/**
 * Send Telegram Action - sends messages via Telegram Bot API
 */
@Injectable()
export class SendTelegramAction {
  private readonly logger = new Logger(SendTelegramAction.name);

  /**
   * Execute telegram message sending
   */
  async execute(config: SendTelegramConfig): Promise<SendTelegramResult> {
    try {
      const { chatId, message, parseMode, botToken } = config;

      if (!botToken) {
        return {
          success: false,
          error:
            'Telegram bot token is required. Please configure credentials.',
        };
      }

      if (!chatId) {
        return {
          success: false,
          error: 'Chat ID is required.',
        };
      }

      if (!message || message.trim() === '') {
        return {
          success: false,
          error: 'Message cannot be empty.',
        };
      }

      // Initialize Telegram API client
      const api = new Api(botToken);

      this.logger.debug(`Sending Telegram message to chat ${chatId}`);

      // Build message options
      const options: {
        parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      } = {};

      if (parseMode) {
        options.parse_mode = parseMode;
      }

      // Send message
      const sentMessage = await api.sendMessage(chatId, message, options);

      this.logger.debug(
        `Telegram message sent: ${sentMessage.message_id} to ${chatId}`,
      );

      return {
        success: true,
        data: {
          messageId: sentMessage.message_id,
          chatId: chatId,
        },
      };
    } catch (error) {
      const errorMessage = this.extractTelegramError(error);

      this.logger.error(`Telegram action failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract meaningful error message from Telegram API errors
   */
  private extractTelegramError(error: unknown): string {
    if (error instanceof Error) {
      // GrammY errors often have description in message
      const message = error.message;

      // Common Telegram error patterns
      if (message.includes('chat not found')) {
        return 'Chat not found. Please verify the chat ID.';
      }
      if (message.includes('bot was blocked')) {
        return 'Bot was blocked by the user.';
      }
      if (message.includes('Unauthorized')) {
        return 'Invalid bot token. Please check your credentials.';
      }
      if (message.includes('message is too long')) {
        return 'Message is too long. Maximum length is 4096 characters.';
      }

      return message;
    }

    return String(error);
  }
}
