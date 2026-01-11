import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Service for managing webhook triggers.
 * Handles URL generation and signature verification.
 */
@Injectable()
export class WebhookTriggerService {
  private readonly logger = new Logger(WebhookTriggerService.name);

  /**
   * Generate a unique webhook token.
   * Uses cryptographically secure random bytes.
   */
  generateWebhookToken(): string {
    return randomBytes(24).toString('base64url');
  }

  /**
   * Generate the full webhook URL.
   * The URL format is: /webhooks/{token}
   */
  generateWebhookUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || process.env.API_BASE_URL || 'http://localhost:3001';
    return `${base}/webhooks/${token}`;
  }

  /**
   * Generate a new secret for webhook signature verification.
   */
  generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Verify webhook signature using HMAC-SHA256.
   *
   * @param payload - The raw request body as string
   * @param signature - The signature from the request header
   * @param secret - The stored secret for this webhook
   * @returns true if signature is valid
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.createSignature(payload, secret);

      // Use timing-safe comparison to prevent timing attacks
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      // Node.js timingSafeEqual requires equal length buffers
      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch (error) {
      this.logger.warn('Signature verification failed', error);
      return false;
    }
  }

  /**
   * Create HMAC-SHA256 signature for a payload.
   * This is the format we expect clients to send.
   */
  createSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Extract token from webhook URL.
   */
  extractTokenFromUrl(webhookUrl: string): string | null {
    const match = webhookUrl.match(/\/webhooks\/([a-zA-Z0-9_-]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Validate webhook token format.
   */
  isValidToken(token: string): boolean {
    // Base64url encoded 24 bytes = 32 characters
    return /^[a-zA-Z0-9_-]{32}$/.test(token);
  }

  /**
   * Build trigger data object from incoming webhook request.
   */
  buildTriggerData(
    body: unknown,
    headers: Record<string, string>,
    query: Record<string, string>,
    method: string,
  ): Record<string, unknown> {
    return {
      body,
      headers: this.sanitizeHeaders(headers),
      query,
      method,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sanitize headers to remove sensitive information.
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
