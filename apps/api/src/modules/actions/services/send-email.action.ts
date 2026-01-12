import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend, CreateEmailOptions } from 'resend';
import { SendEmailConfig, SendEmailResult } from '../types';

/**
 * Send Email Action - sends emails via Resend API
 */
@Injectable()
export class SendEmailAction {
  private readonly logger = new Logger(SendEmailAction.name);
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultFrom =
      this.configService.get<string>('NOTIFICATION_FROM_EMAIL') ||
      'MiniZapier <noreply@syntratrade.xyz>';
  }

  /**
   * Execute email sending
   */
  async execute(config: SendEmailConfig): Promise<SendEmailResult> {
    try {
      const { to, subject, body, html = false, from, replyTo, apiKey } = config;

      if (!apiKey) {
        return {
          success: false,
          error: 'Resend API key is required. Please configure credentials.',
        };
      }

      // Initialize Resend client
      const resend = new Resend(apiKey);

      // Prepare recipients
      const recipients = Array.isArray(to) ? to : [to];

      // Use configured from address or default from env
      const fromAddress = from || this.defaultFrom;

      // Build email options - Resend requires either text or html (not both optional)
      const emailOptions: CreateEmailOptions = html
        ? {
            from: fromAddress,
            to: recipients,
            subject,
            html: body,
            replyTo: replyTo,
          }
        : {
            from: fromAddress,
            to: recipients,
            subject,
            text: body,
            replyTo: replyTo,
          };

      this.logger.debug(
        `Sending email to ${recipients.join(', ')}: ${subject}`,
      );

      // Send email
      const { data, error } = await resend.emails.send(emailOptions);

      if (error) {
        this.logger.error(`Email send failed: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      this.logger.debug(`Email sent successfully: ${data?.id}`);

      return {
        success: true,
        data: {
          id: data?.id || '',
          to: recipients,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Email action failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
