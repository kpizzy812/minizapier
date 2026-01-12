'use client';

import { memo } from 'react';
import { type NodeProps, Position } from '@xyflow/react';
import { Webhook, Clock, Mail } from 'lucide-react';
import { BaseNode, NodeExecutionStatus } from './base-node';
import { Badge } from '@/components/ui/badge';

// Trigger node data types
export interface WebhookTriggerData {
  type: 'webhookTrigger';
  label: string;
  description?: string;
  webhookUrl?: string;
  secret?: string;
}

export interface ScheduleTriggerData {
  type: 'scheduleTrigger';
  label: string;
  description?: string;
  cron: string;
  timezone?: string;
}

export interface EmailTriggerData {
  type: 'emailTrigger';
  label: string;
  description?: string;
  address?: string;
}

export type TriggerNodeData =
  | WebhookTriggerData
  | ScheduleTriggerData
  | EmailTriggerData;

const triggerIcons = {
  webhookTrigger: <Webhook className="h-4 w-4" />,
  scheduleTrigger: <Clock className="h-4 w-4" />,
  emailTrigger: <Mail className="h-4 w-4" />,
};

const triggerLabels = {
  webhookTrigger: 'Webhook',
  scheduleTrigger: 'Schedule',
  emailTrigger: 'Email',
};

function TriggerNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData;
  const executionStatus = (data as unknown as { executionStatus?: NodeExecutionStatus }).executionStatus;
  const icon = triggerIcons[nodeData.type];

  return (
    <BaseNode
      nodeId={id}
      data={{
        label: nodeData.label || triggerLabels[nodeData.type],
        description: nodeData.description,
        icon,
      }}
      selected={selected}
      variant="trigger"
      executionStatus={executionStatus}
      targetHandles={[]} // Triggers have no inputs
      sourceHandles={[{ id: 'source', position: Position.Bottom }]}
    >
      <div className="space-y-2">
        {nodeData.type === 'webhookTrigger' && nodeData.webhookUrl && (
          <div className="rounded bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              URL
            </p>
            <p className="truncate text-xs font-mono">{nodeData.webhookUrl}</p>
          </div>
        )}

        {nodeData.type === 'scheduleTrigger' && nodeData.cron && (
          <div className="rounded bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              Cron
            </p>
            <Badge variant="secondary" className="font-mono text-xs">
              {nodeData.cron}
            </Badge>
          </div>
        )}

        {nodeData.type === 'emailTrigger' && nodeData.address && (
          <div className="rounded bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              Email
            </p>
            <p className="truncate text-xs">{nodeData.address}</p>
          </div>
        )}

        <Badge variant="outline" className="w-full justify-center text-[10px]">
          {triggerLabels[nodeData.type]}
        </Badge>
      </div>
    </BaseNode>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
