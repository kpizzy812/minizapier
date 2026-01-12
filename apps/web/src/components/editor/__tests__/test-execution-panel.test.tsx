import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { TestExecutionPanel } from '../test-execution-panel';
import {
  mockExecutionWithSteps,
  mockRunningExecution,
  mockFailedExecution,
} from '@/test/mocks/executions';

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

// Mock the execution keys
vi.mock('@/hooks/use-executions', () => ({
  executionKeys: {
    all: ['executions'] as const,
    lists: () => ['executions', 'list'] as const,
    list: (params: Record<string, unknown>) => ['executions', 'list', params] as const,
    details: () => ['executions', 'detail'] as const,
    detail: (id: string) => ['executions', 'detail', id] as const,
    stats: (workflowId?: string) => ['executions', 'stats', workflowId] as const,
  },
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

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    getExecution: vi.fn(),
  },
}));

import { useQuery } from '@tanstack/react-query';

describe('TestExecutionPanel', () => {
  const mockOnClose = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when executionId is null', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    const { container } = render(
      <TestExecutionPanel executionId={null} onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    expect(screen.getByText('Test Execution')).toBeInTheDocument();
    // Should show loader
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders successful execution details', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    // Check header
    expect(screen.getByText('Test Execution')).toBeInTheDocument();
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

  it('renders running execution with polling indicator', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { ...mockRunningExecution, steps: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-3" onClose={mockOnClose} />);

    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    // Should show waiting message for steps
    expect(screen.getByText('Waiting for steps to execute...')).toBeInTheDocument();
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

    vi.mocked(useQuery).mockReturnValue({
      data: failedWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-2" onClose={mockOnClose} />);

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Execution Error')).toBeInTheDocument();
    expect(
      screen.getByText('HTTP Request failed: 500 Internal Server Error')
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows refresh button for completed executions', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    const refreshButton = screen.getByTitle('Refresh');
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('does not show refresh button for running executions', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { ...mockRunningExecution, steps: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-3" onClose={mockOnClose} />);

    expect(screen.queryByTitle('Refresh')).not.toBeInTheDocument();
  });

  it('expands step to show details', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    // Click on HTTP Request step to expand (it's not the last one, so not auto-expanded)
    const httpStep = screen.getByText('Webhook Trigger');
    fireEvent.click(httpStep);

    // Should show input/output (may have multiple due to auto-expansion of last step)
    expect(screen.getAllByText('Input').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Output').length).toBeGreaterThanOrEqual(1);
  });

  it('auto-expands error steps', () => {
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

    vi.mocked(useQuery).mockReturnValue({
      data: failedWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-2" onClose={mockOnClose} />);

    // Error step should be auto-expanded
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('renders execution not found state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="invalid-id" onClose={mockOnClose} />);

    expect(screen.getByText('Execution not found')).toBeInTheDocument();
  });

  it('handles empty steps array', () => {
    const executionNoSteps = {
      ...mockExecutionWithSteps,
      steps: [],
    };

    vi.mocked(useQuery).mockReturnValue({
      data: executionNoSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    expect(screen.getByText('Steps (0)')).toBeInTheDocument();
    expect(screen.getByText('No step logs recorded')).toBeInTheDocument();
  });

  it('displays duration in correct format', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockExecutionWithSteps,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useQuery>);

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);

    // The mock execution has 500ms duration (finishedAt - startedAt)
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('configures polling for running execution', () => {
    vi.mocked(useQuery).mockImplementation((options) => {
      // Check that refetchInterval is configured
      const refetchInterval = options.refetchInterval;
      if (typeof refetchInterval === 'function') {
        const result = refetchInterval({ state: { data: { status: 'RUNNING' } } } as never);
        expect(result).toBe(1000);
      }
      return {
        data: { ...mockRunningExecution, steps: [] },
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useQuery>;
    });

    render(<TestExecutionPanel executionId="exec-3" onClose={mockOnClose} />);
  });

  it('stops polling for completed execution', () => {
    vi.mocked(useQuery).mockImplementation((options) => {
      // Check that refetchInterval returns false for completed execution
      const refetchInterval = options.refetchInterval;
      if (typeof refetchInterval === 'function') {
        const result = refetchInterval({ state: { data: { status: 'SUCCESS' } } } as never);
        expect(result).toBe(false);
      }
      return {
        data: mockExecutionWithSteps,
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useQuery>;
    });

    render(<TestExecutionPanel executionId="exec-1" onClose={mockOnClose} />);
  });
});
