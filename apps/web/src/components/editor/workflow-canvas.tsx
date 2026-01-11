'use client';

import { useCallback, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  type OnConnect,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from '@/stores/workflow-store';
import { nodeTypes, type NodeTypeKey } from './nodes';
import { useDnD } from './sidebar';

// Default data for each node type
const defaultNodeData: Record<NodeTypeKey, Record<string, unknown>> = {
  webhookTrigger: {
    type: 'webhookTrigger',
    label: 'Webhook Trigger',
    description: 'Receives HTTP requests',
  },
  scheduleTrigger: {
    type: 'scheduleTrigger',
    label: 'Schedule Trigger',
    description: 'Runs on schedule',
    cron: '0 * * * *',
  },
  emailTrigger: {
    type: 'emailTrigger',
    label: 'Email Trigger',
    description: 'Triggered by email',
  },
  httpRequest: {
    type: 'httpRequest',
    label: 'HTTP Request',
    description: 'Make HTTP request',
    method: 'GET',
    url: '',
  },
  sendEmail: {
    type: 'sendEmail',
    label: 'Send Email',
    description: 'Send email message',
    to: '',
    subject: '',
    body: '',
  },
  sendTelegram: {
    type: 'sendTelegram',
    label: 'Telegram',
    description: 'Send Telegram message',
    chatId: '',
    message: '',
  },
  databaseQuery: {
    type: 'databaseQuery',
    label: 'Database Query',
    description: 'Execute SQL query',
    query: '',
  },
  transform: {
    type: 'transform',
    label: 'Transform',
    description: 'Transform data',
    expression: '',
  },
  condition: {
    type: 'condition',
    label: 'Condition',
    description: 'If/Else branching',
    expression: '',
  },
};

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
  } = useWorkflowStore();

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeTypeKey;

      // Check if dropped element is valid
      if (!nodeType || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: nodeType,
        position,
        data: { ...defaultNodeData[nodeType] },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, type, addNode]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          animated: true,
          style: { strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-background"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="!bg-muted/30"
        />
      </ReactFlow>
    </div>
  );
}
