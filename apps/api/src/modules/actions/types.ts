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
  type: 'jsonpath' | 'expression'; // 'expression' uses safe expr-eval parser
}

export interface TransformResult extends ActionResult {
  data?: unknown;
}

// AI Request types

/**
 * JSON Schema field definition for structured output
 */
export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  items?: SchemaField; // For array type
  properties?: SchemaField[]; // For object type
}

/**
 * Output schema configuration for AI structured output
 */
export interface OutputSchema {
  name: string;
  description?: string;
  fields: SchemaField[];
}

/**
 * AI Request Configuration
 */
export interface AIRequestConfig {
  prompt: string;
  systemPrompt?: string;
  outputSchema?: OutputSchema;
  temperature?: number; // 0-2, default 0.7
  maxTokens?: number; // default 1000
  // From credentials
  apiKey?: string;
  baseUrl?: string; // For different providers (OpenAI, DeepSeek, etc.)
  model?: string;
}

export interface AIRequestResult extends ActionResult {
  data?: {
    content: string | Record<string, unknown>; // String or parsed JSON
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    duration: number;
  };
}
