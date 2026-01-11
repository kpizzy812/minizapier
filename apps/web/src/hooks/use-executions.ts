import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ListExecutionsParams, ExecutionStatus } from '@/lib/api';

// Query keys
export const executionKeys = {
  all: ['executions'] as const,
  lists: () => [...executionKeys.all, 'list'] as const,
  list: (params: ListExecutionsParams) =>
    [...executionKeys.lists(), params] as const,
  details: () => [...executionKeys.all, 'detail'] as const,
  detail: (id: string) => [...executionKeys.details(), id] as const,
  stats: (workflowId?: string) =>
    [...executionKeys.all, 'stats', workflowId] as const,
};

// Fetch executions with pagination and filters
export function useExecutions(params: ListExecutionsParams = {}) {
  return useQuery({
    queryKey: executionKeys.list(params),
    queryFn: () => api.getExecutions(params),
  });
}

// Fetch single execution with steps
export function useExecution(id: string | undefined) {
  return useQuery({
    queryKey: executionKeys.detail(id!),
    queryFn: () => api.getExecution(id!),
    enabled: !!id,
  });
}

// Fetch execution stats
export function useExecutionStats(workflowId?: string) {
  return useQuery({
    queryKey: executionKeys.stats(workflowId),
    queryFn: () => api.getExecutionStats(workflowId),
  });
}

// Replay execution mutation
export function useReplayExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.replayExecution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: executionKeys.stats() });
    },
  });
}

// Cancel execution mutation
export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.cancelExecution(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: executionKeys.lists() });
      queryClient.setQueryData(executionKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: executionKeys.stats() });
    },
  });
}

// Helper to get status color
export function getStatusColor(status: ExecutionStatus): string {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-500';
    case 'FAILED':
      return 'bg-red-500';
    case 'RUNNING':
      return 'bg-blue-500';
    case 'PENDING':
      return 'bg-yellow-500';
    case 'PAUSED':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

// Helper to get status badge variant
export function getStatusVariant(
  status: ExecutionStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'SUCCESS':
      return 'default';
    case 'FAILED':
      return 'destructive';
    case 'RUNNING':
    case 'PENDING':
    case 'PAUSED':
      return 'secondary';
    default:
      return 'outline';
  }
}
