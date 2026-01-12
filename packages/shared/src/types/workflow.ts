// Workflow types for React Flow integration

export type NodeType =
  | 'webhookTrigger'
  | 'scheduleTrigger'
  | 'emailTrigger'
  | 'httpRequest'
  | 'sendEmail'
  | 'sendTelegram'
  | 'databaseQuery'
  | 'transform'
  | 'condition'
  | 'aiRequest';

export interface Position {
  x: number;
  y: number;
}

/**
 * Configuration for step retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 0 = no retry) */
  maxAttempts?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay between retries in milliseconds (default: 30000) */
  maxDelayMs?: number;
}

export interface BaseNodeData {
  label: string;
  description?: string;
  /** Optional retry configuration for this step */
  retryConfig?: RetryConfig;
}

// Trigger node data types
export interface WebhookTriggerData extends BaseNodeData {
  type: 'webhookTrigger';
  webhookUrl?: string;
  secret?: string;
}

export interface ScheduleTriggerData extends BaseNodeData {
  type: 'scheduleTrigger';
  cron: string;
  timezone?: string;
}

export interface EmailTriggerData extends BaseNodeData {
  type: 'emailTrigger';
  address?: string;
}

// Action node data types
export interface HttpRequestData extends BaseNodeData {
  type: 'httpRequest';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  credentialId?: string;
}

export interface SendEmailData extends BaseNodeData {
  type: 'sendEmail';
  to: string;
  subject: string;
  body: string;
  credentialId?: string;
}

export interface SendTelegramData extends BaseNodeData {
  type: 'sendTelegram';
  chatId: string;
  message: string;
  credentialId?: string;
}

export interface DatabaseQueryData extends BaseNodeData {
  type: 'databaseQuery';
  query: string;
  credentialId?: string;
}

export interface TransformData extends BaseNodeData {
  type: 'transform';
  expression: string; // JSONPath or JS expression
}

/**
 * Schema field definition for AI structured output
 */
export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  items?: SchemaField;
  properties?: SchemaField[];
}

export interface AIRequestData extends BaseNodeData {
  type: 'aiRequest';
  prompt: string;
  systemPrompt?: string;
  outputSchema?: {
    name: string;
    description?: string;
    fields: SchemaField[];
  };
  temperature?: number;
  maxTokens?: number;
  credentialId?: string;
}

export interface ConditionData extends BaseNodeData {
  type: 'condition';
  expression: string; // e.g., "{{trigger.body.status}} === 200"
}

export type TriggerNodeData =
  | WebhookTriggerData
  | ScheduleTriggerData
  | EmailTriggerData;

export type ActionNodeData =
  | HttpRequestData
  | SendEmailData
  | SendTelegramData
  | DatabaseQueryData
  | TransformData
  | AIRequestData;

export type LogicNodeData = ConditionData;

export type NodeData = TriggerNodeData | ActionNodeData | LogicNodeData;

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // For condition nodes: 'true' | 'false'
  targetHandle?: string;
}

export interface WorkflowVariables {
  [key: string]: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariables;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  sampleData?: Record<string, unknown>;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
