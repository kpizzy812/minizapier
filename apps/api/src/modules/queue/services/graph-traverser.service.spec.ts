import { GraphTraverserService } from './graph-traverser.service';
import { WorkflowDefinition } from '@minizapier/shared';

describe('GraphTraverserService', () => {
  let service: GraphTraverserService;

  beforeEach(() => {
    service = new GraphTraverserService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildExecutionOrder', () => {
    it('should return correct order for simple linear workflow', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger' },
          },
          {
            id: 'action1',
            type: 'httpRequest',
            position: { x: 0, y: 100 },
            data: { label: 'Action 1' },
          },
          {
            id: 'action2',
            type: 'sendEmail',
            position: { x: 0, y: 200 },
            data: { label: 'Action 2' },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'action1' },
          { id: 'e2', source: 'action1', target: 'action2' },
        ],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order.length).toBe(3);
      expect(order[0].nodeId).toBe('trigger');
      expect(order[1].nodeId).toBe('action1');
      expect(order[2].nodeId).toBe('action2');
    });

    it('should correctly identify dependencies', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger' },
          },
          {
            id: 'action1',
            type: 'httpRequest',
            position: { x: 0, y: 100 },
            data: { label: 'Action 1' },
          },
        ],
        edges: [{ id: 'e1', source: 'trigger', target: 'action1' }],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order[0].dependsOn).toEqual([]);
      expect(order[1].dependsOn).toEqual(['trigger']);
    });

    it('should handle workflow with condition branching', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger' },
          },
          {
            id: 'condition',
            type: 'condition',
            position: { x: 0, y: 100 },
            data: {
              label: 'Condition',
              expression: '{{trigger.status}} === 200',
            },
          },
          {
            id: 'trueBranch',
            type: 'sendEmail',
            position: { x: -100, y: 200 },
            data: { label: 'True Branch' },
          },
          {
            id: 'falseBranch',
            type: 'sendTelegram',
            position: { x: 100, y: 200 },
            data: { label: 'False Branch' },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'condition' },
          {
            id: 'e2',
            source: 'condition',
            target: 'trueBranch',
            sourceHandle: 'true',
          },
          {
            id: 'e3',
            source: 'condition',
            target: 'falseBranch',
            sourceHandle: 'false',
          },
        ],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order.length).toBe(4);
      expect(order[0].nodeId).toBe('trigger');
      expect(order[1].nodeId).toBe('condition');
      // Both branches should come after condition
      const branchNodes = order.slice(2).map((item) => item.nodeId);
      expect(branchNodes).toContain('trueBranch');
      expect(branchNodes).toContain('falseBranch');
    });

    it('should handle workflow with multiple entry points', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger1',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger 1' },
          },
          {
            id: 'trigger2',
            type: 'scheduleTrigger',
            position: { x: 200, y: 0 },
            data: { label: 'Trigger 2' },
          },
          {
            id: 'action',
            type: 'httpRequest',
            position: { x: 100, y: 100 },
            data: { label: 'Action' },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger1', target: 'action' },
          { id: 'e2', source: 'trigger2', target: 'action' },
        ],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order.length).toBe(3);
      // Both triggers should come before action
      const triggerIndices = order
        .map((item, index) => ({ id: item.nodeId, index }))
        .filter((item) => item.id.startsWith('trigger'));
      const actionIndex = order.findIndex((item) => item.nodeId === 'action');

      triggerIndices.forEach((trigger) => {
        expect(trigger.index).toBeLessThan(actionIndex);
      });
    });

    it('should handle empty workflow', () => {
      const definition: WorkflowDefinition = {
        nodes: [],
        edges: [],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order).toEqual([]);
    });

    it('should handle single node workflow', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger' },
          },
        ],
        edges: [],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order.length).toBe(1);
      expect(order[0].nodeId).toBe('trigger');
      expect(order[0].dependsOn).toEqual([]);
    });

    it('should include node type in order items', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger' },
          },
          {
            id: 'action',
            type: 'httpRequest',
            position: { x: 0, y: 100 },
            data: { label: 'Action' },
          },
        ],
        edges: [{ id: 'e1', source: 'trigger', target: 'action' }],
      };

      const order = service.buildExecutionOrder(definition);

      expect(order[0].type).toBe('webhookTrigger');
      expect(order[1].type).toBe('httpRequest');
    });
  });

  describe('findTriggerNodes', () => {
    it('should find webhook trigger', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'trigger',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Trigger' },
          },
          {
            id: 'action',
            type: 'httpRequest',
            position: { x: 0, y: 100 },
            data: { label: 'Action' },
          },
        ],
        edges: [],
      };

      const triggers = service.findTriggerNodes(definition);

      expect(triggers.length).toBe(1);
      expect(triggers[0].id).toBe('trigger');
    });

    it('should find multiple triggers', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'webhook',
            type: 'webhookTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Webhook' },
          },
          {
            id: 'schedule',
            type: 'scheduleTrigger',
            position: { x: 200, y: 0 },
            data: { label: 'Schedule' },
          },
          {
            id: 'email',
            type: 'emailTrigger',
            position: { x: 400, y: 0 },
            data: { label: 'Email' },
          },
        ],
        edges: [],
      };

      const triggers = service.findTriggerNodes(definition);

      expect(triggers.length).toBe(3);
    });

    it('should return empty array when no triggers', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'action',
            type: 'httpRequest',
            position: { x: 0, y: 0 },
            data: { label: 'Action' },
          },
        ],
        edges: [],
      };

      const triggers = service.findTriggerNodes(definition);

      expect(triggers).toEqual([]);
    });
  });

  describe('getOutgoingEdges', () => {
    it('should categorize edges by handle', () => {
      const edges = [
        {
          id: 'e1',
          source: 'condition',
          target: 'true1',
          sourceHandle: 'true',
        },
        {
          id: 'e2',
          source: 'condition',
          target: 'true2',
          sourceHandle: 'true',
        },
        {
          id: 'e3',
          source: 'condition',
          target: 'false1',
          sourceHandle: 'false',
        },
        {
          id: 'e4',
          source: 'condition',
          target: 'other',
          sourceHandle: 'other',
        },
        { id: 'e5', source: 'condition', target: 'default' },
      ];

      const result = service.getOutgoingEdges('condition', edges);

      expect(result.true.length).toBe(2);
      expect(result.false.length).toBe(1);
      expect(result.default.length).toBe(2);
    });

    it('should return empty arrays when no matching edges', () => {
      const edges = [{ id: 'e1', source: 'other', target: 'target' }];

      const result = service.getOutgoingEdges('condition', edges);

      expect(result.true).toEqual([]);
      expect(result.false).toEqual([]);
      expect(result.default).toEqual([]);
    });
  });

  describe('getNextNodesForCondition', () => {
    const edges = [
      {
        id: 'e1',
        source: 'condition',
        target: 'trueNode',
        sourceHandle: 'true',
      },
      {
        id: 'e2',
        source: 'condition',
        target: 'falseNode',
        sourceHandle: 'false',
      },
    ];

    it('should return true branch nodes when condition is true', () => {
      const nextNodes = service.getNextNodesForCondition(
        'condition',
        true,
        edges,
      );

      expect(nextNodes).toEqual(['trueNode']);
    });

    it('should return false branch nodes when condition is false', () => {
      const nextNodes = service.getNextNodesForCondition(
        'condition',
        false,
        edges,
      );

      expect(nextNodes).toEqual(['falseNode']);
    });

    it('should fallback to default edges when branch is missing', () => {
      const edgesWithDefault = [
        { id: 'e1', source: 'condition', target: 'defaultNode' },
      ];

      const nextNodes = service.getNextNodesForCondition(
        'condition',
        true,
        edgesWithDefault,
      );

      expect(nextNodes).toEqual(['defaultNode']);
    });
  });

  describe('getDescendants', () => {
    it('should find all descendant nodes', () => {
      const edges = [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'C' },
        { id: 'e3', source: 'B', target: 'D' },
        { id: 'e4', source: 'C', target: 'E' },
      ];

      const descendants = service.getDescendants('A', edges);

      expect(descendants.size).toBe(4);
      expect(descendants.has('B')).toBe(true);
      expect(descendants.has('C')).toBe(true);
      expect(descendants.has('D')).toBe(true);
      expect(descendants.has('E')).toBe(true);
    });

    it('should return empty set for leaf node', () => {
      const edges = [{ id: 'e1', source: 'A', target: 'B' }];

      const descendants = service.getDescendants('B', edges);

      expect(descendants.size).toBe(0);
    });

    it('should handle nodes with no connections', () => {
      const edges = [{ id: 'e1', source: 'A', target: 'B' }];

      const descendants = service.getDescendants('C', edges);

      expect(descendants.size).toBe(0);
    });
  });

  describe('findNodesToSkip', () => {
    it('should skip false branch when condition is true', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'condition',
            type: 'condition',
            position: { x: 0, y: 0 },
            data: { label: 'Condition' },
          },
          {
            id: 'trueNode',
            type: 'httpRequest',
            position: { x: -100, y: 100 },
            data: { label: 'True' },
          },
          {
            id: 'falseNode',
            type: 'sendEmail',
            position: { x: 100, y: 100 },
            data: { label: 'False' },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'condition',
            target: 'trueNode',
            sourceHandle: 'true',
          },
          {
            id: 'e2',
            source: 'condition',
            target: 'falseNode',
            sourceHandle: 'false',
          },
        ],
      };

      const skipped = service.findNodesToSkip('condition', true, definition);

      expect(skipped.has('falseNode')).toBe(true);
      expect(skipped.has('trueNode')).toBe(false);
    });

    it('should skip true branch when condition is false', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'condition',
            type: 'condition',
            position: { x: 0, y: 0 },
            data: { label: 'Condition' },
          },
          {
            id: 'trueNode',
            type: 'httpRequest',
            position: { x: -100, y: 100 },
            data: { label: 'True' },
          },
          {
            id: 'falseNode',
            type: 'sendEmail',
            position: { x: 100, y: 100 },
            data: { label: 'False' },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'condition',
            target: 'trueNode',
            sourceHandle: 'true',
          },
          {
            id: 'e2',
            source: 'condition',
            target: 'falseNode',
            sourceHandle: 'false',
          },
        ],
      };

      const skipped = service.findNodesToSkip('condition', false, definition);

      expect(skipped.has('trueNode')).toBe(true);
      expect(skipped.has('falseNode')).toBe(false);
    });

    it('should skip all descendants of skipped branch', () => {
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'condition',
            type: 'condition',
            position: { x: 0, y: 0 },
            data: { label: 'Condition' },
          },
          {
            id: 'trueNode',
            type: 'httpRequest',
            position: { x: -100, y: 100 },
            data: { label: 'True' },
          },
          {
            id: 'trueChild',
            type: 'sendEmail',
            position: { x: -100, y: 200 },
            data: { label: 'True Child' },
          },
          {
            id: 'falseNode',
            type: 'sendTelegram',
            position: { x: 100, y: 100 },
            data: { label: 'False' },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'condition',
            target: 'trueNode',
            sourceHandle: 'true',
          },
          { id: 'e2', source: 'trueNode', target: 'trueChild' },
          {
            id: 'e3',
            source: 'condition',
            target: 'falseNode',
            sourceHandle: 'false',
          },
        ],
      };

      const skipped = service.findNodesToSkip('condition', false, definition);

      expect(skipped.has('trueNode')).toBe(true);
      expect(skipped.has('trueChild')).toBe(true);
      expect(skipped.has('falseNode')).toBe(false);
    });

    it('should not skip nodes that are reachable from active branch', () => {
      // Diamond pattern: both branches merge to same node
      const definition: WorkflowDefinition = {
        nodes: [
          {
            id: 'condition',
            type: 'condition',
            position: { x: 0, y: 0 },
            data: { label: 'Condition' },
          },
          {
            id: 'trueNode',
            type: 'httpRequest',
            position: { x: -100, y: 100 },
            data: { label: 'True' },
          },
          {
            id: 'falseNode',
            type: 'sendEmail',
            position: { x: 100, y: 100 },
            data: { label: 'False' },
          },
          {
            id: 'mergeNode',
            type: 'sendTelegram',
            position: { x: 0, y: 200 },
            data: { label: 'Merge' },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'condition',
            target: 'trueNode',
            sourceHandle: 'true',
          },
          {
            id: 'e2',
            source: 'condition',
            target: 'falseNode',
            sourceHandle: 'false',
          },
          { id: 'e3', source: 'trueNode', target: 'mergeNode' },
          { id: 'e4', source: 'falseNode', target: 'mergeNode' },
        ],
      };

      const skipped = service.findNodesToSkip('condition', true, definition);

      expect(skipped.has('falseNode')).toBe(true);
      expect(skipped.has('mergeNode')).toBe(false); // Reachable from true branch
    });
  });
});
