'use client';

import { type DragEvent } from 'react';
import {
  Webhook,
  Clock,
  Mail,
  Globe,
  Send,
  Database,
  Code,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDnD } from './dnd-context';
import type { NodeTypeKey } from '../nodes';

interface NodeDefinition {
  type: NodeTypeKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'trigger' | 'action' | 'logic';
}

const nodeDefinitions: NodeDefinition[] = [
  // Triggers
  {
    type: 'webhookTrigger',
    label: 'Webhook',
    description: 'Triggered by HTTP request',
    icon: <Webhook className="h-5 w-5" />,
    category: 'trigger',
  },
  {
    type: 'scheduleTrigger',
    label: 'Schedule',
    description: 'Runs on a time schedule',
    icon: <Clock className="h-5 w-5" />,
    category: 'trigger',
  },
  {
    type: 'emailTrigger',
    label: 'Email',
    description: 'Triggered by incoming email',
    icon: <Mail className="h-5 w-5" />,
    category: 'trigger',
  },
  // Actions
  {
    type: 'httpRequest',
    label: 'HTTP Request',
    description: 'Make HTTP request',
    icon: <Globe className="h-5 w-5" />,
    category: 'action',
  },
  {
    type: 'sendEmail',
    label: 'Send Email',
    description: 'Send email message',
    icon: <Mail className="h-5 w-5" />,
    category: 'action',
  },
  {
    type: 'sendTelegram',
    label: 'Telegram',
    description: 'Send Telegram message',
    icon: <Send className="h-5 w-5" />,
    category: 'action',
  },
  {
    type: 'databaseQuery',
    label: 'Database',
    description: 'Execute SQL query',
    icon: <Database className="h-5 w-5" />,
    category: 'action',
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Transform data',
    icon: <Code className="h-5 w-5" />,
    category: 'action',
  },
  {
    type: 'aiRequest',
    label: 'AI Request',
    description: 'Call AI/LLM model',
    icon: <Sparkles className="h-5 w-5" />,
    category: 'action',
  },
  // Logic
  {
    type: 'condition',
    label: 'Condition',
    description: 'Split flow based on condition',
    icon: <GitBranch className="h-5 w-5" />,
    category: 'logic',
  },
];

const categoryStyles = {
  trigger: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-500',
  },
  action: {
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
  },
  logic: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/30',
    icon: 'text-amber-500',
  },
};

interface PaletteItemProps {
  node: NodeDefinition;
}

function PaletteItem({ node }: PaletteItemProps) {
  const [, setType] = useDnD();
  const styles = categoryStyles[node.category];

  const onDragStart = (event: DragEvent, nodeType: NodeTypeKey) => {
    setType(nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      className={cn(
        'flex cursor-grab items-center gap-3 rounded-lg border p-3 transition-colors active:cursor-grabbing',
        styles.bg,
        styles.border
      )}
    >
      <div className={cn('flex-shrink-0', styles.icon)}>{node.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{node.label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {node.description}
        </p>
      </div>
    </div>
  );
}

export function NodePalette() {
  const triggers = nodeDefinitions.filter((n) => n.category === 'trigger');
  const actions = nodeDefinitions.filter((n) => n.category === 'action');
  const logic = nodeDefinitions.filter((n) => n.category === 'logic');

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Nodes</h2>
        <p className="text-xs text-muted-foreground">
          Drag nodes to the canvas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Triggers */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Triggers
            </h3>
            <div className="space-y-2">
              {triggers.map((node) => (
                <PaletteItem key={node.type} node={node} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Actions
            </h3>
            <div className="space-y-2">
              {actions.map((node) => (
                <PaletteItem key={node.type} node={node} />
              ))}
            </div>
          </div>

          {/* Logic */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Logic
            </h3>
            <div className="space-y-2">
              {logic.map((node) => (
                <PaletteItem key={node.type} node={node} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
