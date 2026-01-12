'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

/**
 * Node execution status for highlighting
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped';

/**
 * WebSocket event types (matching backend)
 */
const EXECUTION_EVENTS = {
  JOIN_EXECUTION: 'execution:join',
  LEAVE_EXECUTION: 'execution:leave',
  EXECUTION_START: 'execution:start',
  STEP_START: 'step:start',
  STEP_COMPLETE: 'step:complete',
  EXECUTION_COMPLETE: 'execution:complete',
} as const;

/**
 * Step event data
 */
interface StepEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  status: NodeExecutionStatus;
  output?: unknown;
  error?: string;
  duration?: number;
  retryAttempts?: number;
}

/**
 * Execution event data
 */
interface ExecutionEvent {
  executionId: string;
  workflowId: string;
  status: 'SUCCESS' | 'FAILED' | 'PAUSED';
  output?: unknown;
  error?: string;
  finishedAt?: string;
  totalDuration?: number;
}

/**
 * Zustand store for node execution statuses
 */
interface ExecutionStatusStore {
  /** Map of nodeId -> status */
  nodeStatuses: Record<string, NodeExecutionStatus>;
  /** Current execution ID being tracked */
  currentExecutionId: string | null;
  /** Whether execution is in progress */
  isExecuting: boolean;
  /** Set status for a specific node */
  setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  /** Clear all node statuses */
  clearNodeStatuses: () => void;
  /** Set current execution ID */
  setCurrentExecution: (executionId: string | null) => void;
  /** Set executing state */
  setIsExecuting: (isExecuting: boolean) => void;
}

export const useExecutionStatusStore = create<ExecutionStatusStore>((set) => ({
  nodeStatuses: {},
  currentExecutionId: null,
  isExecuting: false,

  setNodeStatus: (nodeId, status) =>
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
    })),

  clearNodeStatuses: () =>
    set({ nodeStatuses: {}, isExecuting: false }),

  setCurrentExecution: (executionId) =>
    set({ currentExecutionId: executionId }),

  setIsExecuting: (isExecuting) =>
    set({ isExecuting }),
}));

/**
 * Hook for WebSocket connection to execution events
 */
export function useExecutionSocket(executionId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const {
    setNodeStatus,
    clearNodeStatuses,
    setCurrentExecution,
    setIsExecuting,
  } = useExecutionStatusStore();

  const connect = useCallback(() => {
    if (!executionId) return;

    // Get API URL from environment and remove /api suffix for WebSocket
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const wsUrl = apiUrl.replace(/\/api$/, '');

    // Create socket connection to /executions namespace
    const socket = io(`${wsUrl}/executions`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Join execution room
      socket.emit(EXECUTION_EVENTS.JOIN_EXECUTION, { executionId });
      setCurrentExecution(executionId);
    });

    socket.on('disconnect', () => {
      // Handle disconnect
    });

    // Handle execution start
    socket.on(EXECUTION_EVENTS.EXECUTION_START, () => {
      clearNodeStatuses();
      setIsExecuting(true);
    });

    // Handle step start
    socket.on(EXECUTION_EVENTS.STEP_START, (data: StepEvent) => {
      setNodeStatus(data.nodeId, 'running');
    });

    // Handle step complete
    socket.on(EXECUTION_EVENTS.STEP_COMPLETE, (data: StepEvent) => {
      setNodeStatus(data.nodeId, data.status);
    });

    // Handle execution complete
    socket.on(EXECUTION_EVENTS.EXECUTION_COMPLETE, (_data: ExecutionEvent) => {
      setIsExecuting(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
    });

    return socket;
  }, [executionId, setNodeStatus, clearNodeStatuses, setCurrentExecution, setIsExecuting]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (executionId) {
        socketRef.current.emit(EXECUTION_EVENTS.LEAVE_EXECUTION, { executionId });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [executionId]);

  useEffect(() => {
    const socket = connect();

    return () => {
      if (socket) {
        disconnect();
      }
    };
  }, [connect, disconnect]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    disconnect,
  };
}
