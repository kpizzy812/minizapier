import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHmac, createVerify, timingSafeEqual } from 'crypto';

/**
 * Parsed email data from inbound webhook
 */
export interface ParsedEmailData {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
  headers?: Record<string, string>;
  timestamp: string;
}

/**
 * Service for managing email triggers.
 * Handles inbound email webhooks from providers like SendGrid/Mailgun.
 */
@Injectable()
export class EmailTriggerService {
  private readonly logger = new Logger(EmailTriggerService.name);

  /**
   * Generate a unique inbound email address.
   * Format: trigger-{token}@{domain}
   */
  generateEmailAddress(domain?: string): string {
    const token = randomBytes(12).toString('hex');
    const emailDomain =
      domain || process.env.INBOUND_EMAIL_DOMAIN || 'inbound.example.com';
    return `trigger-${token}@${emailDomain}`;
  }

  /**
   * Extract trigger token from email address.
   */
  extractTokenFromAddress(address: string): string | null {
    const match = address.match(/^trigger-([a-f0-9]+)@/i);
    return match ? match[1] : null;
  }

  /**
   * Validate email address format.
   */
  isValidEmailAddress(address: string): boolean {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(address);
  }

  /**
   * Verify SendGrid inbound webhook signature.
   * SendGrid signs webhooks with a signature in the header.
   */
  verifySendGridSignature(
    publicKey: string,
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    try {
      // SendGrid uses ECDSA with SHA256
      // Verification requires the public key from SendGrid settings
      const verifier = createVerify('sha256');
      verifier.update(timestamp + payload);

      return verifier.verify(publicKey, signature, 'base64');
    } catch (error) {
      this.logger.warn('SendGrid signature verification failed', error);
      return false;
    }
  }

  /**
   * Verify Mailgun webhook signature.
   * Mailgun uses HMAC-SHA256 with the API key.
   */
  verifyMailgunSignature(
    apiKey: string,
    timestamp: string,
    token: string,
    signature: string,
  ): boolean {
    try {
      const hmac = createHmac('sha256', apiKey);
      hmac.update(timestamp + token);
      const expectedSignature = hmac.digest('hex');

      // Timing-safe comparison
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.warn('Mailgun signature verification failed', error);
      return false;
    }
  }

  /**
   * Safe string conversion helper
   */
  private toStr(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);
    return '';
  }

  /**
   * Parse SendGrid inbound email webhook payload.
   */
  parseSendGridPayload(body: Record<string, unknown>): ParsedEmailData {
    // SendGrid sends form-urlencoded data with these fields
    return {
      from: this.toStr(body.from),
      to: this.toStr(body.to),
      subject: this.toStr(body.subject),
      text: body.text ? this.toStr(body.text) : undefined,
      html: body.html ? this.toStr(body.html) : undefined,
      attachments: this.parseSendGridAttachments(body),
      headers: this.parseEmailHeaders(this.toStr(body.headers)),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse Mailgun inbound email webhook payload.
   */
  parseMailgunPayload(body: Record<string, unknown>): ParsedEmailData {
    // Mailgun sends JSON or form data
    return {
      from: this.toStr(body.sender) || this.toStr(body.from),
      to: this.toStr(body.recipient) || this.toStr(body.To),
      subject: this.toStr(body.subject) || this.toStr(body.Subject),
      text: body['body-plain'] ? this.toStr(body['body-plain']) : undefined,
      html: body['body-html'] ? this.toStr(body['body-html']) : undefined,
      attachments: this.parseMailgunAttachments(body),
      headers: body['message-headers']
        ? this.parseMailgunHeaders(body['message-headers'])
        : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse generic email webhook payload.
   * Tries to extract common fields from any format.
   */
  parseGenericPayload(body: Record<string, unknown>): ParsedEmailData {
    return {
      from:
        this.toStr(body.from) ||
        this.toStr(body.sender) ||
        this.toStr(body.From) ||
        this.toStr(body.Sender),
      to:
        this.toStr(body.to) ||
        this.toStr(body.recipient) ||
        this.toStr(body.To) ||
        this.toStr(body.Recipient),
      subject: this.toStr(body.subject) || this.toStr(body.Subject),
      text: body.text
        ? this.toStr(body.text)
        : body['body-plain']
          ? this.toStr(body['body-plain'])
          : undefined,
      html: body.html
        ? this.toStr(body.html)
        : body['body-html']
          ? this.toStr(body['body-html'])
          : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build trigger data for email execution.
   */
  buildEmailTriggerData(emailData: ParsedEmailData): Record<string, unknown> {
    return {
      type: 'email',
      email: emailData,
      timestamp: emailData.timestamp,
    };
  }

  /**
   * Parse SendGrid attachments info.
   */
  private parseSendGridAttachments(
    body: Record<string, unknown>,
  ):
    | Array<{ filename: string; contentType: string; size: number }>
    | undefined {
    const attachmentInfo = body['attachment-info'];
    if (!attachmentInfo) {
      return undefined;
    }

    try {
      const info: Record<string, unknown> =
        typeof attachmentInfo === 'string'
          ? (JSON.parse(attachmentInfo) as Record<string, unknown>)
          : (attachmentInfo as Record<string, unknown>);

      return Object.values(info).map((att: unknown) => {
        const attachment = att as Record<string, unknown>;
        return {
          filename: this.toStr(attachment.filename) || 'unknown',
          contentType:
            this.toStr(attachment['content-type']) ||
            this.toStr(attachment.type) ||
            'application/octet-stream',
          size: Number(attachment.size) || 0,
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Parse Mailgun attachments info.
   */
  private parseMailgunAttachments(
    body: Record<string, unknown>,
  ):
    | Array<{ filename: string; contentType: string; size: number }>
    | undefined {
    const attachmentCount = Number(body['attachment-count'] || 0);
    if (attachmentCount === 0) {
      return undefined;
    }

    const attachments: Array<{
      filename: string;
      contentType: string;
      size: number;
    }> = [];

    for (let i = 1; i <= attachmentCount; i++) {
      const attachment = body[`attachment-${i}`] as
        | Record<string, unknown>
        | undefined;
      if (attachment) {
        attachments.push({
          filename: this.toStr(attachment.filename) || `attachment-${i}`,
          contentType:
            this.toStr(attachment['content-type']) ||
            'application/octet-stream',
          size: Number(attachment.size || 0),
        });
      }
    }

    return attachments.length > 0 ? attachments : undefined;
  }

  /**
   * Parse email headers string into object.
   */
  private parseEmailHeaders(headersString: string): Record<string, string> {
    const headers: Record<string, string> = {};

    try {
      const lines = headersString.split('\n');
      let currentHeader = '';
      let currentValue = '';

      for (const line of lines) {
        if (line.startsWith(' ') || line.startsWith('\t')) {
          // Continuation of previous header
          currentValue += ' ' + line.trim();
        } else {
          // Save previous header
          if (currentHeader) {
            headers[currentHeader] = currentValue;
          }

          // Start new header
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            currentHeader = line.substring(0, colonIndex).trim();
            currentValue = line.substring(colonIndex + 1).trim();
          }
        }
      }

      // Save last header
      if (currentHeader) {
        headers[currentHeader] = currentValue;
      }
    } catch {
      // Return empty object on parse error
    }

    return headers;
  }

  /**
   * Parse Mailgun message-headers array.
   */
  private parseMailgunHeaders(
    messageHeaders: unknown,
  ): Record<string, string> | undefined {
    if (!Array.isArray(messageHeaders)) {
      return undefined;
    }

    const headers: Record<string, string> = {};

    for (const header of messageHeaders) {
      if (Array.isArray(header) && header.length >= 2) {
        headers[String(header[0])] = String(header[1]);
      }
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  }
}
