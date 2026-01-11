import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { ExecutionList } from '../execution-list';
import {
  mockPaginatedExecutions,
  mockExecution,
  mockFailedExecution,
  mockRunningExecution,
} from '@/test/mocks/executions';

// Mock the hooks
vi.mock('@/hooks/use-executions', () => ({
  useExecutions: vi.fn(),
  useExecution: vi.fn(),
  useReplayExecution: vi.fn(),
  useCancelExecution: vi.fn(),
  getStatusVariant: vi.fn((status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'default';
      case 'FAILED':
        return 'destructive';
      default:
        return 'secondary';
    }
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useExecutions,
  useExecution,
  useReplayExecution,
  useCancelExecution,
} from '@/hooks/use-executions';
import { toast } from 'sonner';

describe('ExecutionList', () => {
  const mockReplayMutate = vi.fn();
  const mockCancelMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useExecution for ExecutionDetails component
    vi.mocked(useExecution).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      status: 'pending',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    vi.mocked(useReplayExecution).mockReturnValue({
      mutateAsync: mockReplayMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useReplayExecution>);

    vi.mocked(useCancelExecution).mockReturnValue({
      mutateAsync: mockCancelMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCancelExecution>);
  });

  it('renders loading state', () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      status: 'pending',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Should show skeleton table rows
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state', () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
      isError: true,
      isPending: false,
      isSuccess: false,
      status: 'error',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    expect(
      screen.getByText('Failed to load executions. Make sure the API is running.')
    ).toBeInTheDocument();
  });

  it('renders empty state', () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: { executions: [], total: 0, skip: 0, take: 10 },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    expect(screen.getByText('No executions found')).toBeInTheDocument();
  });

  it('renders execution list correctly', () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: mockPaginatedExecutions,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Check table headers
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check execution statuses are rendered
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();

    // Check workflow names
    expect(screen.getAllByText('Test Workflow').length).toBeGreaterThan(0);

    // Check total count
    expect(screen.getByText('4 executions')).toBeInTheDocument();
  });

  it('hides workflow column when workflowId is provided', () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: mockPaginatedExecutions,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList workflowId="workflow-1" />);

    // Workflow column should not be visible
    expect(screen.queryByText('Workflow')).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: mockPaginatedExecutions,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Open status filter
    const filterTrigger = screen.getByRole('combobox');
    fireEvent.click(filterTrigger);

    // Select SUCCESS
    const successOption = await screen.findByRole('option', { name: 'Success' });
    fireEvent.click(successOption);

    // Check hook was called with correct params
    await waitFor(() => {
      expect(useExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
        })
      );
    });
  });

  it('handles replay action', async () => {
    mockReplayMutate.mockResolvedValue(mockExecution);

    vi.mocked(useExecutions).mockReturnValue({
      data: {
        executions: [mockExecution],
        total: 1,
        skip: 0,
        take: 10,
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Find and click replay button
    const replayButton = screen.getByTitle('Replay');
    fireEvent.click(replayButton);

    await waitFor(() => {
      expect(mockReplayMutate).toHaveBeenCalledWith('exec-1');
      expect(toast.success).toHaveBeenCalledWith('Execution replayed');
    });
  });

  it('handles cancel action', async () => {
    mockCancelMutate.mockResolvedValue(mockRunningExecution);

    vi.mocked(useExecutions).mockReturnValue({
      data: {
        executions: [mockRunningExecution],
        total: 1,
        skip: 0,
        take: 10,
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Find and click cancel button
    const cancelButton = screen.getByTitle('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockCancelMutate).toHaveBeenCalledWith('exec-3');
      expect(toast.success).toHaveBeenCalledWith('Execution cancelled');
    });
  });

  it('shows error toast on replay failure', async () => {
    mockReplayMutate.mockRejectedValue(new Error('Replay failed'));

    vi.mocked(useExecutions).mockReturnValue({
      data: {
        executions: [mockExecution],
        total: 1,
        skip: 0,
        take: 10,
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    const replayButton = screen.getByTitle('Replay');
    fireEvent.click(replayButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to replay execution');
    });
  });

  it('renders pagination when needed', () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: {
        executions: mockPaginatedExecutions.executions,
        total: 25, // More than PAGE_SIZE (10)
        skip: 0,
        take: 10,
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles pagination navigation', async () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: {
        executions: mockPaginatedExecutions.executions,
        total: 25,
        skip: 0,
        take: 10,
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Click next
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(useExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
        })
      );
    });
  });

  it('opens execution details dialog', async () => {
    vi.mocked(useExecutions).mockReturnValue({
      data: {
        executions: [mockExecution],
        total: 1,
        skip: 0,
        take: 10,
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutions>);

    render(<ExecutionList />);

    // Click view details button
    const viewButton = screen.getByTitle('View details');
    fireEvent.click(viewButton);

    // Dialog should open (ExecutionDetails component will be rendered)
    await waitFor(() => {
      expect(screen.getByText('Execution Details')).toBeInTheDocument();
    });
  });
});
