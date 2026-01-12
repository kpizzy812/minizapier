import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ExecutionDetails } from '../execution-details';
import {
  mockExecutionWithSteps,
  mockFailedExecution,
} from '@/test/mocks/executions';

// Mock the hooks
vi.mock('@/hooks/use-executions', () => ({
  useExecution: vi.fn(),
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

import { useExecution } from '@/hooks/use-executions';

describe('ExecutionDetails', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when executionId is null', () => {
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

    render(
      <ExecutionDetails executionId={null} onClose={mockOnClose} />
    );

    // Dialog should not be visible
    expect(screen.queryByText('Execution Details')).not.toBeInTheDocument();
  });

  it('renders loading state', () => {
    vi.mocked(useExecution).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      status: 'pending',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-1" onClose={mockOnClose} />);

    expect(screen.getByText('Execution Details')).toBeInTheDocument();
    // Should show skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders execution details with steps', () => {
    vi.mocked(useExecution).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-1" onClose={mockOnClose} />);

    // Check dialog title and status badge
    expect(screen.getByText('Execution Details')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();

    // Check summary section
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();

    // Check trigger input
    expect(screen.getByText('Trigger Input')).toBeInTheDocument();

    // Check steps count
    expect(screen.getByText('Steps (3)')).toBeInTheDocument();

    // Check step names
    expect(screen.getByText('Webhook Trigger')).toBeInTheDocument();
    expect(screen.getByText('HTTP Request')).toBeInTheDocument();
    expect(screen.getByText('Transform')).toBeInTheDocument();

    // Check final output
    expect(screen.getByText('Final Output')).toBeInTheDocument();
  });

  it('renders failed execution with error', () => {
    const failedWithSteps = {
      ...mockFailedExecution,
      steps: [
        {
          id: 'step-1',
          executionId: 'exec-2',
          nodeId: 'action-1',
          nodeName: 'HTTP Request',
          status: 'error',
          error: 'Connection refused',
          duration: 5000,
          createdAt: '2024-01-11T11:00:00.500Z',
        },
      ],
    };

    vi.mocked(useExecution).mockReturnValue({
      data: failedWithSteps,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-2" onClose={mockOnClose} />);

    // Check error is displayed
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(
      screen.getByText('HTTP Request failed: 500 Internal Server Error')
    ).toBeInTheDocument();
  });

  it('renders execution not found state', () => {
    vi.mocked(useExecution).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="invalid-id" onClose={mockOnClose} />);

    expect(screen.getByText('Execution not found')).toBeInTheDocument();
  });

  it('expands step to show input/output', () => {
    vi.mocked(useExecution).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-1" onClose={mockOnClose} />);

    // Click on first step to expand
    const triggerStep = screen.getByText('Webhook Trigger');
    fireEvent.click(triggerStep);

    // Check input/output are visible
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('shows step duration correctly', () => {
    vi.mocked(useExecution).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-1" onClose={mockOnClose} />);

    // Check durations are displayed (all < 1000ms are shown as ms)
    expect(screen.getByText('15ms')).toBeInTheDocument(); // Webhook Trigger
    expect(screen.getByText('250ms')).toBeInTheDocument(); // HTTP Request
    expect(screen.getByText('5ms')).toBeInTheDocument(); // Transform
  });

  it('handles empty steps array', () => {
    const executionNoSteps = {
      ...mockExecutionWithSteps,
      steps: [],
    };

    vi.mocked(useExecution).mockReturnValue({
      data: executionNoSteps,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-1" onClose={mockOnClose} />);

    expect(screen.getByText('Steps (0)')).toBeInTheDocument();
    expect(screen.getByText('No step logs recorded')).toBeInTheDocument();
  });

  it('calls onClose when dialog is closed', () => {
    vi.mocked(useExecution).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-1" onClose={mockOnClose} />);

    // Find and click close button (X button in dialog)
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays running execution without duration', () => {
    const runningExecution = {
      id: 'exec-running',
      workflowId: 'workflow-1',
      status: 'RUNNING' as const,
      startedAt: '2024-01-11T12:00:00.000Z',
      steps: [],
    };

    vi.mocked(useExecution).mockReturnValue({
      data: runningExecution,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecution>);

    render(<ExecutionDetails executionId="exec-running" onClose={mockOnClose} />);

    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('Running...')).toBeInTheDocument();
  });
});
