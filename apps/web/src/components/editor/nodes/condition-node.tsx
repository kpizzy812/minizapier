'use client';

import { memo } from 'react';
import { type NodeProps, Position } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';
import { BaseNode, NodeExecutionStatus } from './base-node';

export interface ConditionNodeData {
  type: 'condition';
  label: string;
  description?: string;
  expression: string;
}

function ConditionNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionNodeData;
  const executionStatus = (data as unknown as { executionStatus?: NodeExecutionStatus }).executionStatus;

  return (
    <BaseNode
      nodeId={id}
      data={{
        label: nodeData.label || 'Condition',
        description: nodeData.description,
        icon: <GitBranch className="h-4 w-4" />,
      }}
      selected={selected}
      variant="condition"
      executionStatus={executionStatus}
      targetHandles={[{ id: 'target', position: Position.Top }]}
      sourceHandles={[
        { id: 'true', label: 'True', position: Position.Bottom, style: { left: '25%' } },
        { id: 'false', label: 'False', position: Position.Bottom, style: { left: '75%' } },
      ]}
    >
      <div className="space-y-2">
        {nodeData.expression && (
          <div className="rounded bg-background/50 p-2">
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              If
            </p>
            <p className="line-clamp-2 text-xs font-mono">
              {nodeData.expression}
            </p>
          </div>
        )}

        {/* Branch indicators */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1 text-xs">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-green-600 dark:text-green-400">True</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-red-600 dark:text-red-400">False</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
              <X className="h-3 w-3 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>
    </BaseNode>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
