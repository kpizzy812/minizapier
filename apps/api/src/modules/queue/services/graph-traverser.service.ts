import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
} from '@minizapier/shared';
import { ExecutionOrderItem } from '../types';

/**
 * Service for graph traversal and topological sorting of workflow nodes.
 * Handles both linear and branching (condition) workflows.
 */
@Injectable()
export class GraphTraverserService {
  private readonly logger = new Logger(GraphTraverserService.name);

  /**
   * Build execution order using topological sort (Kahn's algorithm)
   * Returns nodes in order they should be executed
   */
  buildExecutionOrder(definition: WorkflowDefinition): ExecutionOrderItem[] {
    const { nodes, edges } = definition;

    // Build adjacency list and in-degree map
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, WorkflowNode>();

    // Initialize all nodes
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
      nodeMap.set(node.id, node);
    }

    // Build graph from edges
    for (const edge of edges) {
      const targets = adjacencyList.get(edge.source) || [];
      targets.push(edge.target);
      adjacencyList.set(edge.source, targets);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Find all nodes with no incoming edges (triggers)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes in topological order
    const result: ExecutionOrderItem[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      // Find dependencies (nodes that this node depends on)
      const dependsOn = edges
        .filter((e) => e.target === nodeId)
        .map((e) => e.source);

      result.push({
        nodeId,
        type: node.type,
        dependsOn,
      });

      // Add neighbors to queue
      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles (if not all nodes are visited)
    if (result.length !== nodes.length) {
      this.logger.warn('Workflow contains cycles, some nodes will be skipped');
    }

    return result;
  }

  /**
   * Get trigger nodes (entry points) from workflow
   */
  findTriggerNodes(definition: WorkflowDefinition): WorkflowNode[] {
    return definition.nodes.filter((node) =>
      node.type.toLowerCase().includes('trigger'),
    );
  }

  /**
   * Get outgoing edges for a node, organized by handle (for conditions)
   */
  getOutgoingEdges(
    nodeId: string,
    edges: WorkflowEdge[],
  ): { true: WorkflowEdge[]; false: WorkflowEdge[]; default: WorkflowEdge[] } {
    const outgoing = edges.filter((e) => e.source === nodeId);

    return {
      true: outgoing.filter((e) => e.sourceHandle === 'true'),
      false: outgoing.filter((e) => e.sourceHandle === 'false'),
      default: outgoing.filter(
        (e) =>
          !e.sourceHandle ||
          (e.sourceHandle !== 'true' && e.sourceHandle !== 'false'),
      ),
    };
  }

  /**
   * Get nodes that should be executed after a condition node
   * based on the condition result
   */
  getNextNodesForCondition(
    nodeId: string,
    conditionResult: boolean,
    edges: WorkflowEdge[],
  ): string[] {
    const outgoing = this.getOutgoingEdges(nodeId, edges);
    const targetEdges = conditionResult ? outgoing.true : outgoing.false;

    // Fallback to default edges if no specific branch
    const edgesToUse = targetEdges.length > 0 ? targetEdges : outgoing.default;

    return edgesToUse.map((e) => e.target);
  }

  /**
   * Get all descendant nodes (nodes reachable from a given node)
   */
  getDescendants(nodeId: string, edges: WorkflowEdge[]): Set<string> {
    const descendants = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = edges.filter((e) => e.source === current);

      for (const edge of outgoing) {
        if (!descendants.has(edge.target)) {
          descendants.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return descendants;
  }

  /**
   * Find nodes that should be skipped based on condition result
   * When condition is false, skip nodes on the "true" branch (and vice versa)
   */
  findNodesToSkip(
    conditionNodeId: string,
    conditionResult: boolean,
    definition: WorkflowDefinition,
  ): Set<string> {
    const { edges } = definition;
    const outgoing = this.getOutgoingEdges(conditionNodeId, edges);

    // Get edges for the branch that should be skipped
    const skippedBranchEdges = conditionResult ? outgoing.false : outgoing.true;

    // Collect all descendants of skipped branch
    const skippedNodes = new Set<string>();

    for (const edge of skippedBranchEdges) {
      skippedNodes.add(edge.target);
      const descendants = this.getDescendants(edge.target, edges);
      descendants.forEach((d) => skippedNodes.add(d));
    }

    // Remove nodes that are also reachable from the active branch
    const activeEdges = conditionResult ? outgoing.true : outgoing.false;
    for (const edge of activeEdges) {
      skippedNodes.delete(edge.target);
      const descendants = this.getDescendants(edge.target, edges);
      descendants.forEach((d) => skippedNodes.delete(d));
    }

    return skippedNodes;
  }
}
