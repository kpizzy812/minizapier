/**
 * WebSocket Event DTOs for Real-time Execution Updates
 */

/**
 * Node execution status
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped';

/**
 * Emitted when execution starts
 */
export interface ExecutionStartEvent {
  executionId: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
}

/**
 * Emitted when a step starts executing
 */
export interface StepStartEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  status: 'running';
}

/**
 * Emitted when a step completes (success, error, or skipped)
 */
export interface StepCompleteEvent {
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
 * Emitted when execution completes
 */
export interface ExecutionCompleteEvent {
  executionId: string;
  workflowId: string;
  status: 'SUCCESS' | 'FAILED' | 'PAUSED';
  output?: unknown;
  error?: string;
  finishedAt: string;
  totalDuration: number;
}

/**
 * WebSocket event names
 */
export const EXECUTION_EVENTS = {
  // Client -> Server
  JOIN_EXECUTION: 'execution:join',
  LEAVE_EXECUTION: 'execution:leave',

  // Server -> Client
  EXECUTION_START: 'execution:start',
  STEP_START: 'step:start',
  STEP_COMPLETE: 'step:complete',
  EXECUTION_COMPLETE: 'execution:complete',
} as const;
