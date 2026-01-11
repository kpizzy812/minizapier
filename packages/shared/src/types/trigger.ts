// Trigger types

export type TriggerType = 'WEBHOOK' | 'SCHEDULE' | 'EMAIL';

export interface WebhookConfig {
  secret?: string;
}

export interface ScheduleConfig {
  cron: string;
  timezone?: string;
}

export interface EmailConfig {
  address?: string;
}

export type TriggerConfig = WebhookConfig | ScheduleConfig | EmailConfig;

export interface Trigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  webhookUrl?: string;
  workflowId: string;
}
