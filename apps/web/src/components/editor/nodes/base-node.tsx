'use client';

import { memo, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, XCircle, Loader2, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped';

export interface BaseNodeData {
  label: string;
  description?: string;
  icon?: ReactNode;
  isSelected?: boolean;
}

export interface HandleConfig {
  id: string;
  label?: string;
  position?: Position;
  style?: React.CSSProperties;
}

interface BaseNodeProps {
  children?: ReactNode;
  data: BaseNodeData;
  selected?: boolean;
  variant: 'trigger' | 'action' | 'condition';
  sourceHandles?: HandleConfig[];
  targetHandles?: HandleConfig[];
  executionStatus?: NodeExecutionStatus;
  nodeId?: string;
}

const variantStyles = {
  trigger: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    header: 'bg-emerald-500',
    icon: 'text-emerald-500',
  },
  action: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    header: 'bg-blue-500',
    icon: 'text-blue-500',
  },
  condition: {
    border: 'border-amber-500',
    bg: 'bg-amber-500/10',
    header: 'bg-amber-500',
    icon: 'text-amber-500',
  },
};

/**
 * Execution status styles for node highlighting
 */
const executionStatusStyles: Record<NodeExecutionStatus, string> = {
  pending: '',
  running: 'ring-2 ring-blue-500 ring-offset-2 animate-pulse',
  success: 'ring-2 ring-green-500 ring-offset-2',
  error: 'ring-2 ring-red-500 ring-offset-2',
  skipped: 'opacity-50',
};

/**
 * Status indicator icon component
 */
function StatusIndicator({ status }: { status?: NodeExecutionStatus }) {
  if (!status || status === 'pending') return null;

  const iconClass = 'h-4 w-4';

  switch (status) {
    case 'running':
      return <Loader2 className={cn(iconClass, 'text-blue-500 animate-spin')} />;
    case 'success':
      return <CheckCircle2 className={cn(iconClass, 'text-green-500')} />;
    case 'error':
      return <XCircle className={cn(iconClass, 'text-red-500')} />;
    case 'skipped':
      return <MinusCircle className={cn(iconClass, 'text-gray-400')} />;
    default:
      return null;
  }
}

function BaseNodeComponent({
  children,
  data,
  selected,
  variant,
  sourceHandles = [{ id: 'source', position: Position.Bottom }],
  targetHandles = [{ id: 'target', position: Position.Top }],
  executionStatus,
  nodeId,
}: BaseNodeProps) {
  const styles = variantStyles[variant];

  // Calculate handle positions for multiple source handles
  const getHandleStyle = (index: number, total: number): React.CSSProperties => {
    if (total === 1) return {};
    const spacing = 100 / (total + 1);
    return { left: `${spacing * (index + 1)}%` };
  };

  return (
    <div
      className={cn(
        'min-w-[200px] max-w-[280px] rounded-lg border-2 bg-card shadow-md transition-all',
        styles.border,
        selected && !executionStatus && 'ring-2 ring-primary ring-offset-2',
        executionStatus && executionStatusStyles[executionStatus]
      )}
    >
      {/* Target Handles */}
      {targetHandles.map((handle) => (
        <Handle
          key={handle.id}
          type="target"
          position={handle.position ?? Position.Top}
          id={handle.id}
          className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
          style={handle.style}
        />
      ))}

      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-t-md px-3 py-2 text-white',
          styles.header
        )}
      >
        {data.icon && <span className="flex-shrink-0">{data.icon}</span>}
        <span className="flex-1 truncate text-sm font-medium">{data.label}</span>
        <StatusIndicator status={executionStatus} />
      </div>

      {/* Body */}
      <div className={cn('rounded-b-md p-3', styles.bg)}>
        {data.description && (
          <p className="mb-2 text-xs text-muted-foreground">
            {data.description}
          </p>
        )}
        {children}
        {/* Node ID */}
        {nodeId && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-mono truncate" title={nodeId}>
              ID: {nodeId}
            </p>
          </div>
        )}
      </div>

      {/* Source Handles */}
      {sourceHandles.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={handle.position ?? Position.Bottom}
          id={handle.id}
          className={cn(
            '!h-3 !w-3 !border-2 !border-background',
            handle.id === 'true' && '!bg-green-500',
            handle.id === 'false' && '!bg-red-500',
            handle.id !== 'true' && handle.id !== 'false' && '!bg-muted-foreground'
          )}
          style={handle.style ?? getHandleStyle(index, sourceHandles.length)}
        />
      ))}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
