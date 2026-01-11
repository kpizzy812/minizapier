import { WorkflowDefinition } from '@minizapier/shared';

// Job data for workflow execution
export interface WorkflowJobData {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition;
  triggerData: unknown;
  userId: string;
}

// Job data for step retry
export interface RetryStepJobData {
  executionId: string;
  nodeId: string;
  attemptNumber: number;
}

// Execution context - holds data from all executed steps
export interface ExecutionContext {
  trigger: unknown;
  [nodeId: string]: unknown;
}

// Step result
export interface StepResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
}

// Node execution order item
export interface ExecutionOrderItem {
  nodeId: string;
  type: string;
  dependsOn: string[];
}
