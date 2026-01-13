'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { executionKeys, getStatusVariant } from '@/hooks/use-executions';
import { api, StepLog, ExecutionStatus } from '@/lib/api';

interface TestExecutionPanelProps {
  executionId: string | null;
  onClose: () => void;
  onRerun?: () => void;
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

function StepItem({ step, defaultExpanded }: { step: StepLog; defaultExpanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <StepStatusIcon status={step.status} />
          <div className="text-left">
            <div className="font-medium text-sm">{step.nodeName}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {step.nodeId}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
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
              <pre className="text-xs bg-red-50 dark:bg-red-950/30 p-2 rounded overflow-x-auto text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {step.error}
              </pre>
            </div>
          ) : null}

          {step.input !== undefined && step.input !== null ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Input
              </div>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          ) : null}

          {step.output !== undefined && step.output !== null ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output
              </div>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
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

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const isRunning = status === 'RUNNING' || status === 'PENDING';

  return (
    <Badge variant={getStatusVariant(status)} className="gap-1">
      {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
      {status}
    </Badge>
  );
}

export function TestExecutionPanel({ executionId, onClose, onRerun }: TestExecutionPanelProps) {
  // Track current time for live duration updates
  const [currentTime, setCurrentTime] = useState(Date.now);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine if execution is in progress (for polling)
  const isExecutionRunning = useCallback((status?: ExecutionStatus) => {
    return status === 'RUNNING' || status === 'PENDING';
  }, []);

  // Query with conditional polling
  const { data: execution, isLoading, refetch } = useQuery({
    queryKey: executionKeys.detail(executionId!),
    queryFn: () => api.getExecution(executionId!),
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every second while running
      return isExecutionRunning(status) ? 1000 : false;
    },
  });

  // Update current time for live duration display
  useEffect(() => {
    if (!executionId) return;

    // Start timer for updating duration
    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [executionId]);

  // Stop timer when execution completes
  useEffect(() => {
    if (execution && !isExecutionRunning(execution.status) && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [execution, isExecutionRunning]);

  // Memoize duration calculation
  const formattedDuration = useMemo(() => {
    if (!execution) return '-';
    const endTime = execution.finishedAt
      ? new Date(execution.finishedAt).getTime()
      : currentTime;
    const duration = endTime - new Date(execution.startedAt).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  }, [execution, currentTime]);

  if (!executionId) return null;

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Test Execution</h3>
          {execution && <StatusBadge status={execution.status} />}
        </div>
        <div className="flex items-center gap-1">
          {execution && (execution.status === 'SUCCESS' || execution.status === 'FAILED') && onRerun && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRerun}
              title="Rerun test"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : execution ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Started</div>
                  <div className="font-medium">
                    {format(new Date(execution.startedAt), 'HH:mm:ss')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="font-medium">
                    {formattedDuration}
                  </div>
                </div>
              </div>

              {/* Error */}
              {execution.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                    Execution Error
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {execution.error}
                  </div>
                </div>
              )}

              {/* Input */}
              {execution.input !== undefined && execution.input !== null ? (
                <div>
                  <div className="text-sm font-medium mb-2">Trigger Input</div>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-24 whitespace-pre-wrap break-all">
                    {JSON.stringify(execution.input, null, 2)}
                  </pre>
                </div>
              ) : null}

              {/* Steps */}
              <div>
                <div className="text-sm font-medium mb-2">
                  Steps ({execution.steps?.length || 0})
                </div>
                <div className="space-y-2">
                  {execution.steps?.length > 0 ? (
                    execution.steps.map((step, index) => (
                      <StepItem
                        key={step.id}
                        step={step}
                        defaultExpanded={step.status === 'error' || index === execution.steps.length - 1}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {execution.status === 'PENDING' || execution.status === 'RUNNING'
                        ? 'Waiting for steps to execute...'
                        : 'No step logs recorded'}
                    </div>
                  )}
                </div>
              </div>

              {/* Final Output */}
              {execution.output !== undefined && execution.output !== null ? (
                <div>
                  <div className="text-sm font-medium mb-2">Final Output</div>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-24 whitespace-pre-wrap break-all">
                    {JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Execution not found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
