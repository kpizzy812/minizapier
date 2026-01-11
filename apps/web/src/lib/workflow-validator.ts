// Workflow validation utilities

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

const TRIGGER_TYPES = ['webhookTrigger', 'scheduleTrigger', 'emailTrigger'];

/**
 * Validates a workflow definition before saving
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Check if workflow is empty
  if (nodes.length === 0) {
    errors.push({
      type: 'error',
      message: 'Workflow is empty. Add at least one node.',
    });
    return { isValid: false, errors, warnings };
  }

  // 2. Check for trigger node
  const triggerNodes = nodes.filter((n) => TRIGGER_TYPES.includes(n.type));
  if (triggerNodes.length === 0) {
    errors.push({
      type: 'error',
      message: 'Workflow must have at least one trigger node.',
    });
  } else if (triggerNodes.length > 1) {
    warnings.push({
      type: 'warning',
      message: 'Multiple triggers detected. Only the first will be used.',
    });
  }

  // 3. Check for disconnected nodes (nodes with no incoming or outgoing edges)
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const disconnectedNodes = nodes.filter(
    (node) =>
      !connectedNodeIds.has(node.id) && !TRIGGER_TYPES.includes(node.type)
  );

  disconnectedNodes.forEach((node) => {
    warnings.push({
      type: 'warning',
      message: `Node "${node.data.label || node.id}" is not connected to the workflow.`,
      nodeId: node.id,
    });
  });

  // 4. Check trigger has outgoing connections
  triggerNodes.forEach((trigger) => {
    const hasOutgoing = edges.some((e) => e.source === trigger.id);
    if (!hasOutgoing) {
      errors.push({
        type: 'error',
        message: `Trigger "${trigger.data.label || trigger.id}" has no outgoing connections.`,
        nodeId: trigger.id,
      });
    }
  });

  // 5. Check condition nodes have both outputs connected
  const conditionNodes = nodes.filter((n) => n.type === 'condition');
  conditionNodes.forEach((condition) => {
    const outgoingEdges = edges.filter((e) => e.source === condition.id);
    const hasTrueOutput = outgoingEdges.some((e) => e.sourceHandle === 'true');
    const hasFalseOutput = outgoingEdges.some(
      (e) => e.sourceHandle === 'false'
    );

    if (!hasTrueOutput && !hasFalseOutput) {
      errors.push({
        type: 'error',
        message: `Condition "${condition.data.label || condition.id}" has no outputs connected.`,
        nodeId: condition.id,
      });
    } else if (!hasTrueOutput) {
      warnings.push({
        type: 'warning',
        message: `Condition "${condition.data.label || condition.id}" is missing "true" branch.`,
        nodeId: condition.id,
      });
    } else if (!hasFalseOutput) {
      warnings.push({
        type: 'warning',
        message: `Condition "${condition.data.label || condition.id}" is missing "false" branch.`,
        nodeId: condition.id,
      });
    }
  });

  // 6. Check for cycles using DFS
  const hasCycle = detectCycle(nodes, edges);
  if (hasCycle) {
    errors.push({
      type: 'error',
      message:
        'Workflow contains a cycle. Cycles are not allowed in workflows.',
    });
  }

  // 7. Check action nodes have required fields
  nodes.forEach((node) => {
    const validationErrors = validateNodeData(node);
    errors.push(...validationErrors);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect cycles in the workflow graph using DFS
 */
function detectCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const adjacencyList = new Map<string, string[]>();

  // Build adjacency list
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
  });

  edges.forEach((edge) => {
    const neighbors = adjacencyList.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

/**
 * Validate individual node data based on type
 */
function validateNodeData(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const data = node.data as Record<string, unknown>;

  switch (node.type) {
    case 'httpRequest':
      if (!data.url || (data.url as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `HTTP Request "${data.label || node.id}" is missing URL.`,
          nodeId: node.id,
        });
      }
      break;

    case 'sendEmail':
      if (!data.to || (data.to as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Send Email "${data.label || node.id}" is missing recipient.`,
          nodeId: node.id,
        });
      }
      if (!data.subject || (data.subject as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Send Email "${data.label || node.id}" is missing subject.`,
          nodeId: node.id,
        });
      }
      break;

    case 'sendTelegram':
      if (!data.chatId || (data.chatId as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Send Telegram "${data.label || node.id}" is missing chat ID.`,
          nodeId: node.id,
        });
      }
      if (!data.message || (data.message as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Send Telegram "${data.label || node.id}" is missing message.`,
          nodeId: node.id,
        });
      }
      break;

    case 'databaseQuery':
      if (!data.query || (data.query as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Database Query "${data.label || node.id}" is missing SQL query.`,
          nodeId: node.id,
        });
      }
      break;

    case 'condition':
      if (!data.expression || (data.expression as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Condition "${data.label || node.id}" is missing expression.`,
          nodeId: node.id,
        });
      }
      break;

    case 'scheduleTrigger':
      if (!data.cron || (data.cron as string).trim() === '') {
        errors.push({
          type: 'error',
          message: `Schedule Trigger "${data.label || node.id}" is missing cron expression.`,
          nodeId: node.id,
        });
      }
      break;
  }

  return errors;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const messages: string[] = [];

  result.errors.forEach((e) => {
    messages.push(`Error: ${e.message}`);
  });

  result.warnings.forEach((w) => {
    messages.push(`Warning: ${w.message}`);
  });

  return messages.join('\n');
}
