import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface WorkflowErrorNotification {
  workflowId: string;
  workflowName: string;
  executionId: string;
  error: string;
  notificationEmail: string;
  startedAt: Date;
  finishedAt: Date;
}

/**
 * NotificationsService - handles error notifications for workflow executions
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('NOTIFICATION_FROM_EMAIL') ||
      'MiniZapier <notifications@resend.dev>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Notifications service initialized with Resend');
    } else {
      this.resend = null;
      this.logger.warn(
        'RESEND_API_KEY not configured - notifications disabled',
      );
    }
  }

  /**
   * Send error notification for a failed workflow execution
   */
  async sendWorkflowErrorNotification(
    notification: WorkflowErrorNotification,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.resend) {
      this.logger.warn(
        'Cannot send notification - Resend not configured',
      );
      return { success: false, error: 'Notifications not configured' };
    }

    const {
      workflowId,
      workflowName,
      executionId,
      error,
      notificationEmail,
      startedAt,
      finishedAt,
    } = notification;

    const duration = finishedAt.getTime() - startedAt.getTime();
    const durationStr =
      duration < 1000
        ? `${duration}ms`
        : `${(duration / 1000).toFixed(1)}s`;

    const subject = `[MiniZapier] Workflow Failed: ${workflowName}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .error-text { color: #b91c1c; font-family: monospace; white-space: pre-wrap; word-break: break-all; }
    .meta { color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Workflow Execution Failed</h2>
    </div>
    <div class="content">
      <p><strong>Workflow:</strong> ${workflowName}</p>
      <p class="meta">
        <strong>Execution ID:</strong> ${executionId}<br>
        <strong>Started:</strong> ${startedAt.toISOString()}<br>
        <strong>Duration:</strong> ${durationStr}
      </p>

      <div class="error-box">
        <strong>Error:</strong>
        <div class="error-text">${this.escapeHtml(error)}</div>
      </div>

      <p>Please review the execution logs for more details.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
Workflow Execution Failed

Workflow: ${workflowName}
Execution ID: ${executionId}
Started: ${startedAt.toISOString()}
Duration: ${durationStr}

Error:
${error}

Please review the execution logs for more details.
    `.trim();

    try {
      this.logger.debug(
        `Sending error notification to ${notificationEmail} for workflow ${workflowId}`,
      );

      const { data, error: sendError } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [notificationEmail],
        subject,
        html: htmlBody,
        text: textBody,
      });

      if (sendError) {
        this.logger.error(
          `Failed to send notification: ${sendError.message}`,
        );
        return { success: false, error: sendError.message };
      }

      this.logger.log(
        `Error notification sent successfully: ${data?.id}`,
      );
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Notification sending failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
