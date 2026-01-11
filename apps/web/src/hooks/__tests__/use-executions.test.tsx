import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useExecutions,
  useExecution,
  useExecutionStats,
  useReplayExecution,
  useCancelExecution,
  executionKeys,
  getStatusColor,
  getStatusVariant,
} from '../use-executions';
import { api } from '@/lib/api';
import {
  mockPaginatedExecutions,
  mockExecutionWithSteps,
  mockExecutionStats,
  mockExecution,
} from '@/test/mocks/executions';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    getExecutions: vi.fn(),
    getExecution: vi.fn(),
    getExecutionStats: vi.fn(),
    replayExecution: vi.fn(),
    cancelExecution: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('use-executions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executionKeys', () => {
    it('generates correct query keys', () => {
      expect(executionKeys.all).toEqual(['executions']);
      expect(executionKeys.lists()).toEqual(['executions', 'list']);
      expect(executionKeys.list({ status: 'SUCCESS' })).toEqual([
        'executions',
        'list',
        { status: 'SUCCESS' },
      ]);
      expect(executionKeys.details()).toEqual(['executions', 'detail']);
      expect(executionKeys.detail('exec-1')).toEqual([
        'executions',
        'detail',
        'exec-1',
      ]);
      expect(executionKeys.stats('workflow-1')).toEqual([
        'executions',
        'stats',
        'workflow-1',
      ]);
      expect(executionKeys.stats()).toEqual(['executions', 'stats', undefined]);
    });
  });

  describe('useExecutions', () => {
    it('fetches executions successfully', async () => {
      vi.mocked(api.getExecutions).mockResolvedValue(mockPaginatedExecutions);

      const { result } = renderHook(() => useExecutions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedExecutions);
      expect(api.getExecutions).toHaveBeenCalledWith({});
    });

    it('passes params to API', async () => {
      vi.mocked(api.getExecutions).mockResolvedValue(mockPaginatedExecutions);

      const params = {
        workflowId: 'workflow-1',
        status: 'SUCCESS' as const,
        skip: 10,
        take: 20,
      };

      const { result } = renderHook(() => useExecutions(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getExecutions).toHaveBeenCalledWith(params);
    });

    it('handles API error', async () => {
      vi.mocked(api.getExecutions).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useExecutions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useExecution', () => {
    it('fetches single execution with steps', async () => {
      vi.mocked(api.getExecution).mockResolvedValue(mockExecutionWithSteps);

      const { result } = renderHook(() => useExecution('exec-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExecutionWithSteps);
      expect(api.getExecution).toHaveBeenCalledWith('exec-1');
    });

    it('does not fetch when id is undefined', () => {
      const { result } = renderHook(() => useExecution(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(api.getExecution).not.toHaveBeenCalled();
    });
  });

  describe('useExecutionStats', () => {
    it('fetches stats without workflowId', async () => {
      vi.mocked(api.getExecutionStats).mockResolvedValue(mockExecutionStats);

      const { result } = renderHook(() => useExecutionStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExecutionStats);
      expect(api.getExecutionStats).toHaveBeenCalledWith(undefined);
    });

    it('fetches stats with workflowId', async () => {
      vi.mocked(api.getExecutionStats).mockResolvedValue(mockExecutionStats);

      const { result } = renderHook(() => useExecutionStats('workflow-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getExecutionStats).toHaveBeenCalledWith('workflow-1');
    });
  });

  describe('useReplayExecution', () => {
    it('replays execution successfully', async () => {
      vi.mocked(api.replayExecution).mockResolvedValue(mockExecution);

      const { result } = renderHook(() => useReplayExecution(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('exec-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.replayExecution).toHaveBeenCalledWith('exec-1');
    });
  });

  describe('useCancelExecution', () => {
    it('cancels execution successfully', async () => {
      vi.mocked(api.cancelExecution).mockResolvedValue({
        ...mockExecution,
        status: 'PAUSED',
      });

      const { result } = renderHook(() => useCancelExecution(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('exec-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.cancelExecution).toHaveBeenCalledWith('exec-1');
    });
  });

  describe('helper functions', () => {
    describe('getStatusColor', () => {
      it('returns correct colors for each status', () => {
        expect(getStatusColor('SUCCESS')).toBe('bg-green-500');
        expect(getStatusColor('FAILED')).toBe('bg-red-500');
        expect(getStatusColor('RUNNING')).toBe('bg-blue-500');
        expect(getStatusColor('PENDING')).toBe('bg-yellow-500');
        expect(getStatusColor('PAUSED')).toBe('bg-orange-500');
        expect(getStatusColor('UNKNOWN' as never)).toBe('bg-gray-500');
      });
    });

    describe('getStatusVariant', () => {
      it('returns correct variants for each status', () => {
        expect(getStatusVariant('SUCCESS')).toBe('default');
        expect(getStatusVariant('FAILED')).toBe('destructive');
        expect(getStatusVariant('RUNNING')).toBe('secondary');
        expect(getStatusVariant('PENDING')).toBe('secondary');
        expect(getStatusVariant('PAUSED')).toBe('secondary');
        expect(getStatusVariant('UNKNOWN' as never)).toBe('outline');
      });
    });
  });
});
