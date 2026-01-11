'use client';

import { X, Trash2, MousePointerClick } from 'lucide-react';
import { useWorkflowStore, type NodeType } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  WebhookTriggerForm,
  ScheduleTriggerForm,
  EmailTriggerForm,
  HttpRequestForm,
  SendEmailForm,
  SendTelegramForm,
  DatabaseQueryForm,
  TransformForm,
  ConditionForm,
} from './forms';

// Node type display names for header
const nodeTypeNames: Record<NodeType, string> = {
  webhookTrigger: 'Webhook Trigger',
  scheduleTrigger: 'Schedule Trigger',
  emailTrigger: 'Email Trigger',
  httpRequest: 'HTTP Request',
  sendEmail: 'Send Email',
  sendTelegram: 'Telegram Message',
  databaseQuery: 'Database Query',
  transform: 'Transform Data',
  condition: 'Condition',
};

// Color classes for node types
const nodeTypeColors: Record<NodeType, string> = {
  webhookTrigger: 'bg-emerald-500',
  scheduleTrigger: 'bg-emerald-500',
  emailTrigger: 'bg-emerald-500',
  httpRequest: 'bg-blue-500',
  sendEmail: 'bg-blue-500',
  sendTelegram: 'bg-blue-500',
  databaseQuery: 'bg-blue-500',
  transform: 'bg-blue-500',
  condition: 'bg-amber-500',
};

export function NodePropertiesPanel() {
  const { nodes, selectedNodeId, selectNode, deleteNode, updateNodeData } =
    useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Handle field update
  const handleUpdate = (data: Record<string, unknown>) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, data);
    }
  };

  // Handle node deletion
  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  };

  // Close panel
  const handleClose = () => {
    selectNode(null);
  };

  // Render form based on node type
  const renderForm = () => {
    if (!selectedNode) return null;

    const nodeType = selectedNode.type;
    const data = selectedNode.data as Record<string, unknown>;

    switch (nodeType) {
      case 'webhookTrigger':
        return <WebhookTriggerForm data={data} onUpdate={handleUpdate} />;
      case 'scheduleTrigger':
        return <ScheduleTriggerForm data={data} onUpdate={handleUpdate} />;
      case 'emailTrigger':
        return <EmailTriggerForm data={data} onUpdate={handleUpdate} />;
      case 'httpRequest':
        return <HttpRequestForm data={data} onUpdate={handleUpdate} />;
      case 'sendEmail':
        return <SendEmailForm data={data} onUpdate={handleUpdate} />;
      case 'sendTelegram':
        return <SendTelegramForm data={data} onUpdate={handleUpdate} />;
      case 'databaseQuery':
        return <DatabaseQueryForm data={data} onUpdate={handleUpdate} />;
      case 'transform':
        return <TransformForm data={data} onUpdate={handleUpdate} />;
      case 'condition':
        return <ConditionForm data={data} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };

  // Empty state - no node selected
  if (!selectedNode) {
    return (
      <div className="flex h-full w-80 flex-col border-l bg-background">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Properties</h2>
          <p className="text-xs text-muted-foreground">
            Configure selected node
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-muted p-4">
            <MousePointerClick className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-muted-foreground">No node selected</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click on a node to view and edit its settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nodeType = selectedNode.type;

  return (
    <div className="flex h-full w-80 flex-col border-l bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${nodeTypeColors[nodeType]}`} />
            <h2 className="font-semibold">{nodeTypeNames[nodeType]}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form content */}
      <ScrollArea className="flex-1">
        <div className="p-4">{renderForm()}</div>
      </ScrollArea>

      {/* Footer with delete button */}
      <div className="border-t p-4">
        <Separator className="mb-4" />
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Node
        </Button>
      </div>
    </div>
  );
}
