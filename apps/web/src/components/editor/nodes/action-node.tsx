'use client';

import { memo } from 'react';
import { type NodeProps, Position } from '@xyflow/react';
import { Globe, Mail, Send, Database, Code } from 'lucide-react';
import { BaseNode, NodeExecutionStatus } from './base-node';
import { Badge } from '@/components/ui/badge';

// Action node data types
export interface HttpRequestData {
  type: 'httpRequest';
  label: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  credentialId?: string;
}

export interface SendEmailData {
  type: 'sendEmail';
  label: string;
  description?: string;
  to: string;
  subject: string;
  body: string;
  credentialId?: string;
}

export interface SendTelegramData {
  type: 'sendTelegram';
  label: string;
  description?: string;
  chatId: string;
  message: string;
  credentialId?: string;
}

export interface DatabaseQueryData {
  type: 'databaseQuery';
  label: string;
  description?: string;
  query: string;
  credentialId?: string;
}

export interface TransformData {
  type: 'transform';
  label: string;
  description?: string;
  expression: string;
}

export type ActionNodeData =
  | HttpRequestData
  | SendEmailData
  | SendTelegramData
  | DatabaseQueryData
  | TransformData;

const actionIcons = {
  httpRequest: <Globe className="h-4 w-4" />,
  sendEmail: <Mail className="h-4 w-4" />,
  sendTelegram: <Send className="h-4 w-4" />,
  databaseQuery: <Database className="h-4 w-4" />,
  transform: <Code className="h-4 w-4" />,
};

const actionLabels = {
  httpRequest: 'HTTP Request',
  sendEmail: 'Send Email',
  sendTelegram: 'Telegram',
  databaseQuery: 'Database',
  transform: 'Transform',
};

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-700 dark:text-green-400',
  POST: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  PUT: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  PATCH: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  DELETE: 'bg-red-500/20 text-red-700 dark:text-red-400',
};

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const executionStatus = (data as unknown as { executionStatus?: NodeExecutionStatus }).executionStatus;
  const icon = actionIcons[nodeData.type];

  return (
    <BaseNode
      data={{
        label: nodeData.label || actionLabels[nodeData.type],
        description: nodeData.description,
        icon,
      }}
      selected={selected}
      variant="action"
      executionStatus={executionStatus}
      targetHandles={[{ id: 'target', position: Position.Top }]}
      sourceHandles={[{ id: 'source', position: Position.Bottom }]}
    >
      <div className="space-y-2">
        {nodeData.type === 'httpRequest' && (
          <>
            <div className="flex items-center gap-2">
              <Badge className={methodColors[nodeData.method]}>
                {nodeData.method}
              </Badge>
            </div>
            {nodeData.url && (
              <div className="rounded bg-background/50 p-2">
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  URL
                </p>
                <p className="truncate text-xs font-mono">{nodeData.url}</p>
              </div>
            )}
          </>
        )}

        {nodeData.type === 'sendEmail' && (
          <>
            {nodeData.to && (
              <div className="rounded bg-background/50 p-2">
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  To
                </p>
                <p className="truncate text-xs">{nodeData.to}</p>
              </div>
            )}
            {nodeData.subject && (
              <div className="rounded bg-background/50 p-2">
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  Subject
                </p>
                <p className="truncate text-xs">{nodeData.subject}</p>
              </div>
            )}
          </>
        )}

        {nodeData.type === 'sendTelegram' && (
          <>
            {nodeData.chatId && (
              <div className="rounded bg-background/50 p-2">
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  Chat ID
                </p>
                <p className="truncate text-xs font-mono">{nodeData.chatId}</p>
              </div>
            )}
          </>
        )}

        {nodeData.type === 'databaseQuery' && nodeData.query && (
          <div className="rounded bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              Query
            </p>
            <p className="line-clamp-2 text-xs font-mono">{nodeData.query}</p>
          </div>
        )}

        {nodeData.type === 'transform' && nodeData.expression && (
          <div className="rounded bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              Expression
            </p>
            <p className="line-clamp-2 text-xs font-mono">
              {nodeData.expression}
            </p>
          </div>
        )}

        <Badge variant="outline" className="w-full justify-center text-[10px]">
          {actionLabels[nodeData.type]}
        </Badge>
      </div>
    </BaseNode>
  );
}

export const ActionNode = memo(ActionNodeComponent);
