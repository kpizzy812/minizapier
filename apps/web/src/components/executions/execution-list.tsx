'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Square,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useExecutions,
  useReplayExecution,
  useCancelExecution,
  getStatusVariant,
} from '@/hooks/use-executions';
import { ExecutionStatus } from '@/lib/api';
import { ExecutionDetails } from './execution-details';

interface ExecutionListProps {
  workflowId?: string;
}

const PAGE_SIZE = 10;

export function ExecutionList({ workflowId }: ExecutionListProps) {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'ALL'>('ALL');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const { data, isLoading, error } = useExecutions({
    workflowId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const replayExecution = useReplayExecution();
  const cancelExecution = useCancelExecution();

  const handleReplay = async (id: string) => {
    try {
      await replayExecution.mutateAsync(id);
      toast.success('Execution replayed');
    } catch {
      toast.error('Failed to replay execution');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelExecution.mutateAsync(id);
      toast.success('Execution cancelled');
    } catch {
      toast.error('Failed to cancel execution');
    }
  };

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) return '-';
    const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load execution history.</p>
        <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again.</p>
      </div>
    );
  }

  const executions = data?.executions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as ExecutionStatus | 'ALL');
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {total} execution{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {executions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No workflow runs yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter !== 'ALL'
              ? 'Try changing the status filter above'
              : 'Executions will appear here when your workflows run'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Status</TableHead>
                {!workflowId && <TableHead>Workflow</TableHead>}
                <TableHead>Started</TableHead>
                <TableHead className="w-24">Duration</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <Badge variant={getStatusVariant(execution.status)}>
                      {execution.status === 'RUNNING' && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      {execution.status}
                    </Badge>
                  </TableCell>
                  {!workflowId && (
                    <TableCell className="font-medium">
                      {execution.workflow?.name || 'Unknown'}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {format(new Date(execution.startedAt), 'MMM d, HH:mm:ss')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(execution.startedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDuration(execution.startedAt, execution.finishedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedExecutionId(execution.id)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(execution.status === 'PENDING' ||
                        execution.status === 'RUNNING') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCancel(execution.id)}
                          title="Cancel"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      {(execution.status === 'SUCCESS' ||
                        execution.status === 'FAILED') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReplay(execution.id)}
                          title="Replay"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <ExecutionDetails
        executionId={selectedExecutionId}
        onClose={() => setSelectedExecutionId(null)}
      />
    </div>
  );
}
