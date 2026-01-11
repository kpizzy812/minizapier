import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CreateCredentialInput, UpdateCredentialInput } from '@/lib/api';

// Query keys
export const credentialKeys = {
  all: ['credentials'] as const,
  lists: () => [...credentialKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...credentialKeys.lists(), filters] as const,
  details: () => [...credentialKeys.all, 'detail'] as const,
  detail: (id: string) => [...credentialKeys.details(), id] as const,
};

// Fetch all credentials
export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.lists(),
    queryFn: () => api.getCredentials(),
  });
}

// Fetch single credential
export function useCredential(id: string | undefined) {
  return useQuery({
    queryKey: credentialKeys.detail(id!),
    queryFn: () => api.getCredential(id!),
    enabled: !!id,
  });
}

// Create credential mutation
export function useCreateCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCredentialInput) => api.createCredential(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
    },
  });
}

// Update credential mutation
export function useUpdateCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCredentialInput }) =>
      api.updateCredential(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
      queryClient.setQueryData(credentialKeys.detail(data.id), data);
    },
  });
}

// Delete credential mutation
export function useDeleteCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
    },
  });
}

// Test credential mutation
export function useTestCredential() {
  return useMutation({
    mutationFn: (id: string) => api.testCredential(id),
  });
}
