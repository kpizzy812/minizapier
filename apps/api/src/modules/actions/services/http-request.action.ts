import { Injectable, Logger } from '@nestjs/common';
import { HttpRequestConfig, HttpRequestResult } from '../types';
import { validateUrlForSsrf } from '../../../common/utils';

/**
 * HTTP Request Action - makes HTTP requests to external APIs
 *
 * Security: Includes SSRF protection to prevent requests to internal networks,
 * localhost, and cloud metadata endpoints.
 */
@Injectable()
export class HttpRequestAction {
  private readonly logger = new Logger(HttpRequestAction.name);
  private readonly defaultTimeout = 30000; // 30 seconds

  /**
   * Execute an HTTP request
   */
  async execute(config: HttpRequestConfig): Promise<HttpRequestResult> {
    const startTime = Date.now();

    try {
      const { method, url, headers = {}, body, timeout, auth } = config;

      // SSRF Protection: Validate URL before making request
      const urlValidation = validateUrlForSsrf(url);
      if (!urlValidation.isValid) {
        this.logger.warn(`SSRF protection blocked request to: ${url}`);
        return {
          success: false,
          error: urlValidation.error || 'URL validation failed',
        };
      }

      // Build headers with auth
      const requestHeaders = new Headers(headers);

      // Apply authentication
      if (auth) {
        this.applyAuth(requestHeaders, auth);
      }

      // Set default content-type for POST/PUT/PATCH if body exists
      if (body && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeout || this.defaultTimeout,
      );

      this.logger.debug(`HTTP ${method} ${url}`);

      // Execute request
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: method !== 'GET' && method !== 'DELETE' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else {
        responseBody = await response.text();
      }

      const duration = Date.now() - startTime;

      this.logger.debug(
        `HTTP ${method} ${url} -> ${response.status} (${duration}ms)`,
      );

      // Consider 2xx and 3xx as success
      const success = response.status >= 200 && response.status < 400;

      return {
        success,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          duration,
        },
        error: success
          ? undefined
          : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      this.logger.error(`HTTP request failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration },
      };
    }
  }

  /**
   * Apply authentication to headers
   */
  private applyAuth(
    headers: Headers,
    auth: NonNullable<HttpRequestConfig['auth']>,
  ): void {
    switch (auth.type) {
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`,
          ).toString('base64');
          headers.set('Authorization', `Basic ${credentials}`);
        }
        break;

      case 'bearer':
        if (auth.token) {
          headers.set('Authorization', `Bearer ${auth.token}`);
        }
        break;

      case 'api_key':
        if (auth.apiKey) {
          const headerName = auth.headerName || 'X-API-Key';
          headers.set(headerName, auth.apiKey);
        }
        break;
    }
  }

  /**
   * Extract error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return 'Request timeout';
      }
      return error.message;
    }
    return String(error);
  }
}
