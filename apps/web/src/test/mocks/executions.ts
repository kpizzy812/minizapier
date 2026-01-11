import {
  Execution,
  ExecutionWithSteps,
  ExecutionStats,
  StepLog,
  PaginatedExecutions,
} from '@/lib/api';

export const mockStepLogs: StepLog[] = [
  {
    id: 'step-1',
    executionId: 'exec-1',
    nodeId: 'trigger-1',
    nodeName: 'Webhook Trigger',
    status: 'success',
    input: { body: { test: 'data' } },
    output: { body: { test: 'data' } },
    duration: 15,
    createdAt: '2024-01-11T10:00:00.000Z',
  },
  {
    id: 'step-2',
    executionId: 'exec-1',
    nodeId: 'action-1',
    nodeName: 'HTTP Request',
    status: 'success',
    input: { url: 'https://api.example.com' },
    output: { status: 200, data: { result: 'ok' } },
    duration: 250,
    createdAt: '2024-01-11T10:00:00.100Z',
  },
  {
    id: 'step-3',
    executionId: 'exec-1',
    nodeId: 'action-2',
    nodeName: 'Transform',
    status: 'success',
    input: { data: { result: 'ok' } },
    output: { transformed: true },
    duration: 5,
    createdAt: '2024-01-11T10:00:00.350Z',
  },
];

export const mockExecution: Execution = {
  id: 'exec-1',
  workflowId: 'workflow-1',
  status: 'SUCCESS',
  startedAt: '2024-01-11T10:00:00.000Z',
  finishedAt: '2024-01-11T10:00:00.500Z',
  input: { body: { test: 'data' } },
  output: { transformed: true },
  workflow: {
    id: 'workflow-1',
    name: 'Test Workflow',
  },
};

export const mockExecutionWithSteps: ExecutionWithSteps = {
  ...mockExecution,
  steps: mockStepLogs,
};

export const mockFailedExecution: Execution = {
  id: 'exec-2',
  workflowId: 'workflow-1',
  status: 'FAILED',
  startedAt: '2024-01-11T11:00:00.000Z',
  finishedAt: '2024-01-11T11:00:01.000Z',
  input: { body: { invalid: 'data' } },
  error: 'HTTP Request failed: 500 Internal Server Error',
  workflow: {
    id: 'workflow-1',
    name: 'Test Workflow',
  },
};

export const mockRunningExecution: Execution = {
  id: 'exec-3',
  workflowId: 'workflow-2',
  status: 'RUNNING',
  startedAt: '2024-01-11T12:00:00.000Z',
  workflow: {
    id: 'workflow-2',
    name: 'Another Workflow',
  },
};

export const mockExecutions: Execution[] = [
  mockExecution,
  mockFailedExecution,
  mockRunningExecution,
  {
    id: 'exec-4',
    workflowId: 'workflow-1',
    status: 'PENDING',
    startedAt: '2024-01-11T13:00:00.000Z',
    workflow: {
      id: 'workflow-1',
      name: 'Test Workflow',
    },
  },
];

export const mockPaginatedExecutions: PaginatedExecutions = {
  executions: mockExecutions,
  total: 4,
  skip: 0,
  take: 10,
};

export const mockExecutionStats: ExecutionStats = {
  total: 100,
  success: 85,
  failed: 10,
  running: 3,
  pending: 2,
  averageDuration: 1250,
};

export const mockEmptyStats: ExecutionStats = {
  total: 0,
  success: 0,
  failed: 0,
  running: 0,
  pending: 0,
};
