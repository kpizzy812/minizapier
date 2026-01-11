import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ExecutionStats } from '../execution-stats';
import { mockExecutionStats, mockEmptyStats } from '@/test/mocks/executions';

// Mock the useExecutionStats hook
vi.mock('@/hooks/use-executions', () => ({
  useExecutionStats: vi.fn(),
}));

import { useExecutionStats } from '@/hooks/use-executions';

describe('ExecutionStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeletons', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      status: 'pending',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats />);

    // Should show 4 skeleton cards
    const cards = document.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders execution stats correctly', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: mockExecutionStats,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats />);

    // Check total executions
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Total Executions')).toBeInTheDocument();

    // Check success rate
    expect(screen.getByText('85% success rate')).toBeInTheDocument();

    // Check successful count
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();

    // Check failed count
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();

    // Check average duration (1250ms = 1.3s - toFixed(1) rounds 1.25 up)
    expect(screen.getByText('1.3s')).toBeInTheDocument();
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
  });

  it('shows running and pending counts when available', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: mockExecutionStats,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats />);

    // Check running indicator (text is split between nodes)
    expect(screen.getByText(/3.*running/)).toBeInTheDocument();
  });

  it('renders nothing when no data', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    const { container } = render(<ExecutionStats />);
    expect(container.firstChild).toBeNull();
  });

  it('handles zero stats correctly', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: mockEmptyStats,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats />);

    // Check 0% success rate (0 / 0)
    expect(screen.getByText('0% success rate')).toBeInTheDocument();
    expect(screen.getByText('Per execution')).toBeInTheDocument();
  });

  it('passes workflowId to hook', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: mockExecutionStats,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats workflowId="workflow-123" />);

    expect(useExecutionStats).toHaveBeenCalledWith('workflow-123');
  });

  it('formats duration in milliseconds for small values', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: { ...mockExecutionStats, averageDuration: 500 },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats />);
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('formats duration in minutes for large values', () => {
    vi.mocked(useExecutionStats).mockReturnValue({
      data: { ...mockExecutionStats, averageDuration: 90000 },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as ReturnType<typeof useExecutionStats>);

    render(<ExecutionStats />);
    expect(screen.getByText('1.5m')).toBeInTheDocument();
  });
});
