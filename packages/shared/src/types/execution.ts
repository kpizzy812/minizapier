// Execution types

export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PAUSED';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped';

export interface StepLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  status: StepStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
  createdAt: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  steps?: StepLog[];
}

// Real-time execution update via WebSocket
export interface ExecutionUpdate {
  executionId: string;
  nodeId: string;
  status: StepStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
}
