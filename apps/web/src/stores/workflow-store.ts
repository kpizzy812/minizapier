import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';

export type NodeType =
  | 'webhookTrigger'
  | 'scheduleTrigger'
  | 'emailTrigger'
  | 'httpRequest'
  | 'sendEmail'
  | 'sendTelegram'
  | 'databaseQuery'
  | 'transform'
  | 'condition'
  | 'aiRequest';

export interface WorkflowNode extends Node {
  type: NodeType;
}

// History snapshot for undo/redo
interface HistorySnapshot {
  nodes: WorkflowNode[];
  edges: Edge[];
}

const MAX_HISTORY_SIZE = 50;

interface WorkflowState {
  // Workflow metadata
  workflowId: string | null;
  workflowName: string;

  // React Flow state
  nodes: WorkflowNode[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Undo/Redo history
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Actions
  setWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: WorkflowNode[], addToHistory?: boolean) => void;
  setEdges: (edges: Edge[], addToHistory?: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: WorkflowNode) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  resetWorkflow: () => void;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
}

const initialState = {
  workflowId: null,
  workflowName: 'New Workflow',
  nodes: [] as WorkflowNode[],
  edges: [] as Edge[],
  selectedNodeId: null,
  past: [] as HistorySnapshot[],
  future: [] as HistorySnapshot[],
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  ...initialState,

  setWorkflowId: (id) => set({ workflowId: id }),

  setWorkflowName: (name) => set({ workflowName: name }),

  setNodes: (nodes, addToHistory = false) => {
    if (addToHistory) {
      get().saveToHistory();
    }
    set({ nodes, future: addToHistory ? [] : get().future });
  },

  setEdges: (edges, addToHistory = false) => {
    if (addToHistory) {
      get().saveToHistory();
    }
    set({ edges, future: addToHistory ? [] : get().future });
  },

  onNodesChange: (changes) => {
    // Only save to history for significant changes (not position during drag)
    const isSignificantChange = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (isSignificantChange) {
      get().saveToHistory();
    }
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
      future: isSignificantChange ? [] : get().future,
    });
  },

  onEdgesChange: (changes) => {
    const isSignificantChange = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (isSignificantChange) {
      get().saveToHistory();
    }
    set({
      edges: applyEdgeChanges(changes, get().edges),
      future: isSignificantChange ? [] : get().future,
    });
  },

  onConnect: (connection) => {
    get().saveToHistory();
    set({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { strokeWidth: 2 },
        },
        get().edges
      ),
      future: [],
    });
  },

  addNode: (node) => {
    get().saveToHistory();
    set({
      nodes: [...get().nodes, node],
      future: [],
    });
  },

  updateNodeData: (nodeId, data) => {
    get().saveToHistory();
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
      future: [],
    });
  },

  deleteNode: (nodeId) => {
    get().saveToHistory();
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      future: [],
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  resetWorkflow: () => set(initialState),

  // Undo/Redo implementation
  saveToHistory: () => {
    const { nodes, edges, past } = get();
    const newPast = [...past, { nodes: [...nodes], edges: [...edges] }];
    // Limit history size
    if (newPast.length > MAX_HISTORY_SIZE) {
      newPast.shift();
    }
    set({ past: newPast });
  },

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      past: newPast,
      nodes: previous.nodes,
      edges: previous.edges,
      future: [{ nodes: [...nodes], edges: [...edges] }, ...future],
    });
  },

  redo: () => {
    const { future, nodes, edges, past } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      future: newFuture,
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes: [...nodes], edges: [...edges] }],
    });
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,
}));
