/**
 * Types for action execution
 */

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  // Auth from credentials
  auth?: {
    type: 'basic' | 'bearer' | 'api_key';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    headerName?: string;
  };
}

export interface HttpRequestResult extends ActionResult {
  data?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    duration: number;
  };
}

export interface SendEmailConfig {
  to: string | string[];
  subject: string;
  body: string;
  html?: boolean;
  from?: string;
  replyTo?: string;
  // From credentials
  apiKey?: string;
}

export interface SendEmailResult extends ActionResult {
  data?: {
    id: string;
    to: string[];
  };
}

export interface SendTelegramConfig {
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  // From credentials
  botToken?: string;
}

export interface SendTelegramResult extends ActionResult {
  data?: {
    messageId: number;
    chatId: string;
  };
}

export interface DatabaseQueryConfig {
  query: string;
  params?: unknown[];
  // From credentials
  connectionString?: string;
}

export interface DatabaseQueryResult extends ActionResult {
  data?: {
    rows: unknown[];
    rowCount: number;
    fields: string[];
  };
}

export interface TransformConfig {
  expression: string;
  type: 'jsonpath' | 'javascript';
}

export interface TransformResult extends ActionResult {
  data?: unknown;
}
