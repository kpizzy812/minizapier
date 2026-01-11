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
  | 'condition';

export interface Position {
  x: number;
  y: number;
}

export interface BaseNodeData {
  label: string;
  description?: string;
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
  | TransformData;

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
