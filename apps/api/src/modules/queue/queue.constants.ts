// Queue names and job types
export const WORKFLOW_QUEUE = 'workflow-execution';

export enum WorkflowJobType {
  EXECUTE = 'execute',
  RETRY_STEP = 'retry-step',
}

// Default job options
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // Start with 1 second
  },
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs
  },
};
