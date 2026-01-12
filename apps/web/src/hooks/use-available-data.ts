import { useMemo } from 'react';
import { useWorkflowStore, type NodeType } from '@/stores/workflow-store';
import type { DataSource } from '@/components/editor/data-picker';

// Node type display names
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

// Sample data structure for triggers (used when no test data available)
const triggerSampleData: Partial<Record<NodeType, Record<string, unknown>>> = {
  webhookTrigger: {
    body: {
      id: 123,
      name: 'Example Name',
      email: 'example@email.com',
      data: { key: 'value' },
    },
    headers: {
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    },
    query: {
      param1: 'value1',
      param2: 'value2',
    },
    method: 'POST',
    url: '/webhook/abc123',
  },
  scheduleTrigger: {
    timestamp: new Date().toISOString(),
    scheduledTime: new Date().toISOString(),
    cron: '0 9 * * *',
    timezone: 'UTC',
  },
  emailTrigger: {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Email Subject',
    text: 'Email body text',
    html: '<p>Email body HTML</p>',
    attachments: [],
  },
};

// Sample data structure for action outputs
const actionSampleData: Partial<Record<NodeType, Record<string, unknown>>> = {
  httpRequest: {
    status: 200,
    statusText: 'OK',
    data: { result: 'success', id: 456 },
    headers: { 'content-type': 'application/json' },
  },
  sendEmail: {
    success: true,
    messageId: 'msg_abc123',
  },
  sendTelegram: {
    success: true,
    messageId: 12345,
    chatId: 67890,
  },
  databaseQuery: {
    rows: [
      { id: 1, name: 'Row 1', value: 100 },
      { id: 2, name: 'Row 2', value: 200 },
    ],
    rowCount: 2,
  },
  transform: {
    result: { transformed: 'data' },
  },
  condition: {
    result: true,
    matchedBranch: 'true',
  },
  aiRequest: {
    content: 'AI generated response',
    model: 'gpt-4o-mini',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
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

  // If output schema is defined, build sample from schema fields
  if (outputSchema?.fields && outputSchema.fields.length > 0) {
    return {
      content: buildSampleFromSchema(outputSchema.fields),
      model: 'gpt-4o-mini',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };
  }

  // Default sample data when no schema
  return actionSampleData.aiRequest || {};
}

/**
 * Gets all predecessor nodes in the workflow graph using BFS
 */
function getPredecessorNodes(
  targetNodeId: string,
  nodes: Array<{ id: string; type: NodeType; data: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string }>
): Array<{ id: string; type: NodeType; data: Record<string, unknown> }> {
  const predecessors: Array<{
    id: string;
    type: NodeType;
    data: Record<string, unknown>;
  }> = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Find all edges pointing to target and add sources to queue
  edges.forEach((edge) => {
    if (edge.target === targetNodeId) {
      queue.push(edge.source);
    }
  });

  // BFS to find all predecessors
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodes.find((n) => n.id === currentId);
    if (node) {
      predecessors.push({
        id: node.id,
        type: node.type,
        data: node.data as Record<string, unknown>,
      });

      // Add predecessors of current node to queue
      edges.forEach((edge) => {
        if (edge.target === currentId && !visited.has(edge.source)) {
          queue.push(edge.source);
        }
      });
    }
  }

  // Reverse to get them in execution order (triggers first)
  return predecessors.reverse();
}

/**
 * Hook to get available data sources for the currently selected node
 * Returns data from trigger and all predecessor nodes
 */
export function useAvailableData(
  sampleData?: Record<string, unknown> | null
): DataSource[] {
  const { nodes, edges, selectedNodeId } = useWorkflowStore();

  return useMemo(() => {
    if (!selectedNodeId) return [];

    const sources: DataSource[] = [];
    const predecessors = getPredecessorNodes(
      selectedNodeId,
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data as Record<string, unknown>,
      })),
      edges.map((e) => ({ source: e.source, target: e.target }))
    );

    for (const node of predecessors) {
      const nodeLabel =
        (node.data.label as string) || nodeTypeNames[node.type] || node.id;
      const isTrigger = node.type.includes('Trigger');

      // Get sample data for this node
      let nodeData: Record<string, unknown>;

      if (sampleData && sampleData[node.id]) {
        // Use actual sample data from test run
        nodeData = sampleData[node.id] as Record<string, unknown>;
      } else if (isTrigger) {
        // Use static sample data for trigger
        nodeData = triggerSampleData[node.type] || { data: {} };
      } else if (node.type === 'aiRequest') {
        // AI Request uses dynamic sample data based on output schema
        nodeData = getAIRequestSampleData(node.data);
      } else {
        // Use static sample data for action
        nodeData = actionSampleData[node.type] || { output: {} };
      }

      sources.push({
        id: isTrigger ? 'trigger' : node.id,
        name: isTrigger ? `Trigger (${nodeLabel})` : nodeLabel,
        description: isTrigger
          ? 'Data from the workflow trigger'
          : `Output from ${nodeLabel}`,
        data: nodeData,
      });
    }

    return sources;
  }, [selectedNodeId, nodes, edges, sampleData]);
}

/**
 * Hook to get sample data structure for a specific node type
 * Useful for preview without actual test data
 */
export function useSampleDataForNodeType(
  nodeType: NodeType
): Record<string, unknown> {
  return useMemo(() => {
    if (nodeType.includes('Trigger')) {
      return triggerSampleData[nodeType] || {};
    }
    return actionSampleData[nodeType] || {};
  }, [nodeType]);
}
