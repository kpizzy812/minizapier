'use client';

import { useMemo } from 'react';
import { useWorkflowStore, WorkflowNode, NodeType } from '@/stores/workflow-store';
import type { DataSource } from '@/components/editor/data-picker';

// Display names for node types
const nodeTypeNames: Record<NodeType, string> = {
  webhookTrigger: 'Webhook',
  scheduleTrigger: 'Schedule',
  emailTrigger: 'Email',
  httpRequest: 'HTTP Request',
  sendEmail: 'Send Email',
  sendTelegram: 'Telegram',
  databaseQuery: 'Database',
  transform: 'Transform',
  condition: 'Condition',
  aiRequest: 'AI Request',
};

// Sample data for triggers (used when no execution data available)
const triggerSampleData: Record<string, Record<string, unknown>> = {
  webhookTrigger: {
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Sample/1.0',
    },
    body: {
      message: 'Sample webhook data',
      user: {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
      },
      timestamp: '2024-01-15T10:30:00Z',
    },
    query: {
      action: 'notify',
    },
  },
  scheduleTrigger: {
    timestamp: '2024-01-15T10:30:00Z',
    scheduledTime: '2024-01-15T10:30:00Z',
    iteration: 1,
  },
  emailTrigger: {
    from: 'sender@example.com',
    to: 'trigger@example.com',
    subject: 'Sample Email Subject',
    text: 'Plain text content',
    html: '<p>HTML content</p>',
    date: '2024-01-15T10:30:00Z',
    attachments: [],
  },
};

// Schema field type for AI output schema
interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  items?: SchemaField;
  properties?: SchemaField[];
}

// Sample data for action nodes
const actionSampleData: Record<string, Record<string, unknown>> = {
  httpRequest: {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
    },
    data: {
      success: true,
      result: {
        id: 456,
        value: 'Response data',
      },
    },
  },
  sendEmail: {
    success: true,
    messageId: 'msg_123abc',
  },
  sendTelegram: {
    success: true,
    messageId: 12345,
    chatId: '-100123456789',
  },
  databaseQuery: {
    rows: [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: 200 },
    ],
    rowCount: 2,
  },
  transform: {
    transformed: true,
    data: 'Transformed result',
  },
  aiRequest: {
    content: 'AI generated response',
    model: 'gpt-4o-mini',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  },
};

/**
 * Build sample data from output schema fields
 */
function buildSampleFromSchema(fields: SchemaField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    switch (field.type) {
      case 'string':
        result[field.name] = field.description || `Sample ${field.name}`;
        break;
      case 'number':
        result[field.name] = 0;
        break;
      case 'boolean':
        result[field.name] = true;
        break;
      case 'array':
        if (field.items) {
          result[field.name] = [buildSampleFromSchema([field.items])[field.items.name]];
        } else {
          result[field.name] = [];
        }
        break;
      case 'object':
        if (field.properties) {
          result[field.name] = buildSampleFromSchema(field.properties);
        } else {
          result[field.name] = {};
        }
        break;
    }
  }

  return result;
}

/**
 * Get sample data for AI Request node - uses output schema if defined
 */
function getAIRequestSampleData(nodeData: Record<string, unknown>): Record<string, unknown> {
  const outputSchema = nodeData.outputSchema as { fields?: SchemaField[] } | undefined;

  // If output schema is defined, build sample from it
  if (outputSchema?.fields && outputSchema.fields.length > 0) {
    return {
      content: buildSampleFromSchema(outputSchema.fields),
      model: 'gpt-4o-mini',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };
  }

  // Default sample data when no schema
  return actionSampleData.aiRequest;
}

/**
 * Find all predecessor nodes for a given node ID
 * Uses edges to traverse the workflow graph backwards
 */
function getPredecessorNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: { source: string; target: string }[]
): WorkflowNode[] {
  const predecessors: WorkflowNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    // Find all edges pointing to this node
    const incomingEdges = edges.filter((e) => e.target === currentId);

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        predecessors.push(sourceNode);
        traverse(sourceNode.id);
      }
    }
  }

  traverse(nodeId);

  // Reverse to get chronological order (trigger first)
  return predecessors.reverse();
}

/**
 * Hook to get data sources for a node
 * Returns DataSource[] containing data from trigger and previous steps
 */
export function useNodeDataSources(nodeId: string | null): DataSource[] {
  const { nodes, edges } = useWorkflowStore();

  return useMemo(() => {
    if (!nodeId) return [];

    const predecessors = getPredecessorNodes(nodeId, nodes, edges);
    const sources: DataSource[] = [];

    for (const node of predecessors) {
      const nodeType = node.type;
      const nodeData = node.data as Record<string, unknown>;
      const label = (nodeData.label as string) || nodeTypeNames[nodeType];

      // Determine sample data based on node type
      const isTrigger = ['webhookTrigger', 'scheduleTrigger', 'emailTrigger'].includes(nodeType);

      let sampleData: Record<string, unknown>;
      if (isTrigger) {
        sampleData = triggerSampleData[nodeType] || {};
      } else if (nodeType === 'aiRequest') {
        // AI Request uses dynamic sample data based on output schema
        sampleData = getAIRequestSampleData(nodeData);
      } else {
        sampleData = actionSampleData[nodeType] || {};
      }

      sources.push({
        id: node.id,
        name: label,
        description: isTrigger ? 'Trigger data' : 'Step output',
        data: sampleData,
      });
    }

    return sources;
  }, [nodeId, nodes, edges]);
}

/**
 * Hook specifically for condition builder
 * Returns flattened field paths from all data sources
 */
export function useConditionFields(nodeId: string | null): string[] {
  const sources = useNodeDataSources(nodeId);

  return useMemo(() => {
    const fields: string[] = [];

    function extractPaths(obj: unknown, basePath: string) {
      if (obj === null || obj === undefined) return;
      if (typeof obj !== 'object') {
        fields.push(basePath);
        return;
      }

      if (Array.isArray(obj)) {
        fields.push(basePath);
        if (obj.length > 0) {
          extractPaths(obj[0], `${basePath}[0]`);
        }
        return;
      }

      const entries = Object.entries(obj as Record<string, unknown>);
      for (const [key, value] of entries) {
        const path = basePath ? `${basePath}.${key}` : key;
        extractPaths(value, path);
      }
    }

    for (const source of sources) {
      extractPaths(source.data, source.id);
    }

    return fields;
  }, [sources]);
}
