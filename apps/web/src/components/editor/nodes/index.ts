export { BaseNode, type BaseNodeData, type HandleConfig } from './base-node';
export {
  TriggerNode,
  type TriggerNodeData,
  type WebhookTriggerData,
  type ScheduleTriggerData,
  type EmailTriggerData,
} from './trigger-node';
export {
  ActionNode,
  type ActionNodeData,
  type HttpRequestData,
  type SendEmailData,
  type SendTelegramData,
  type DatabaseQueryData,
  type TransformData,
} from './action-node';
export { ConditionNode, type ConditionNodeData } from './condition-node';

import { TriggerNode } from './trigger-node';
import { ActionNode } from './action-node';
import { ConditionNode } from './condition-node';

// Node types registry for React Flow
export const nodeTypes = {
  // Triggers
  webhookTrigger: TriggerNode,
  scheduleTrigger: TriggerNode,
  emailTrigger: TriggerNode,
  // Actions
  httpRequest: ActionNode,
  sendEmail: ActionNode,
  sendTelegram: ActionNode,
  databaseQuery: ActionNode,
  transform: ActionNode,
  aiRequest: ActionNode,
  // Logic
  condition: ConditionNode,
};

export type NodeTypeKey = keyof typeof nodeTypes;
