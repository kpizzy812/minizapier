'use client';

import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecution, getStatusVariant } from '@/hooks/use-executions';
import { StepLog } from '@/lib/api';

interface ExecutionDetailsProps {
  executionId: string | null;
  onClose: () => void;
}

function StepStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'skipped':
      return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function StepItem({ step }: { step: StepLog }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <StepStatusIcon status={step.status} />
          <div className="text-left">
            <div className="font-medium">{step.nodeName}</div>
            <div className="text-xs text-muted-foreground">
              {step.nodeId}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {formatDuration(step.duration)}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t p-3 space-y-3 bg-muted/30">
          {step.error ? (
            <div>
              <div className="text-xs font-medium text-red-500 mb-1">Error</div>
              <pre className="text-xs bg-red-50 dark:bg-red-950/30 p-2 rounded overflow-x-auto text-red-700 dark:text-red-300">
                {step.error}
              </pre>
            </div>
          ) : null}

          {step.input !== undefined && step.input !== null ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Input
              </div>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-40">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          ) : null}

          {step.output !== undefined && step.output !== null ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output
              </div>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-40">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            Executed at {format(new Date(step.createdAt), 'HH:mm:ss.SSS')}
          </div>
        </div>
      )}
    </div>
  );
}

export function ExecutionDetails({ executionId, onClose }: ExecutionDetailsProps) {
  const { data: execution, isLoading } = useExecution(executionId || undefined);

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) return 'Running...';
    const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  return (
    <Dialog open={!!executionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Execution Details
            {execution && (
              <Badge variant={getStatusVariant(execution.status)}>
                {execution.status}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View execution timeline, step logs, and input/output data
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : execution ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Started</div>
                <div className="font-medium">
                  {format(new Date(execution.startedAt), 'MMM d, yyyy HH:mm:ss')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="font-medium">
                  {formatDuration(execution.startedAt, execution.finishedAt)}
                </div>
              </div>
              {execution.error && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Error</div>
                  <div className="text-sm text-red-500 font-medium">
                    {execution.error}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            {execution.input !== undefined && execution.input !== null ? (
              <div>
                <div className="text-sm font-medium mb-2">Trigger Input</div>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-32">
                  {JSON.stringify(execution.input, null, 2)}
                </pre>
              </div>
            ) : null}

            {/* Steps */}
            <div>
              <div className="text-sm font-medium mb-2">
                Steps ({execution.steps?.length || 0})
              </div>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {execution.steps?.length > 0 ? (
                    execution.steps.map((step) => (
                      <StepItem key={step.id} step={step} />
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No step logs recorded
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Output */}
            {execution.output !== undefined && execution.output !== null ? (
              <div>
                <div className="text-sm font-medium mb-2">Final Output</div>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-32">
                  {JSON.stringify(execution.output, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Execution not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
