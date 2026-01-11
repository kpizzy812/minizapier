import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CreateWorkflowInput, UpdateWorkflowInput } from '@/lib/api';

// Query keys
export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
};

// Fetch all workflows
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: () => api.getWorkflows(),
  });
}

// Fetch single workflow
export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(id!),
    queryFn: () => api.getWorkflow(id!),
    enabled: !!id,
  });
}

// Create workflow mutation
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkflowInput) => api.createWorkflow(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

// Update workflow mutation
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkflowInput }) =>
      api.updateWorkflow(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.setQueryData(workflowKeys.detail(data.id), data);
    },
  });
}

// Delete workflow mutation
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

// Duplicate workflow mutation
export function useDuplicateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.duplicateWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

// Toggle workflow active state
export function useToggleWorkflowActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? api.activateWorkflow(id) : api.deactivateWorkflow(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.setQueryData(workflowKeys.detail(data.id), data);
    },
  });
}
