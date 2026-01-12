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
  Copy,
  Check,
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
import { Button } from '@/components/ui/button';
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

function CollapsibleSection({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-sm font-medium">{title}</div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div className="border-t p-3 bg-muted/30">
          {children}
        </div>
      )}
    </div>
  );
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
              <pre className="text-xs bg-red-50 dark:bg-red-950/30 p-2 rounded text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {step.error}
              </pre>
            </div>
          ) : null}

          {step.input !== undefined && step.input !== null ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Input
              </div>
              <ScrollArea className="max-h-40 rounded border">
                <pre className="text-xs bg-background p-2 whitespace-pre-wrap break-all">
                  {JSON.stringify(step.input, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          ) : null}

          {step.output !== undefined && step.output !== null ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output
              </div>
              <ScrollArea className="max-h-40 rounded border">
                <pre className="text-xs bg-background p-2 whitespace-pre-wrap break-all">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              </ScrollArea>
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
  const [copied, setCopied] = useState(false);

  const copyAllData = async () => {
    if (!execution) return;

    const data = {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      error: execution.error,
      input: execution.input,
      output: execution.output,
      steps: execution.steps?.map((step) => ({
        nodeId: step.nodeId,
        nodeName: step.nodeName,
        status: step.status,
        duration: step.duration,
        input: step.input,
        output: step.output,
        error: step.error,
        createdAt: step.createdAt,
      })),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) return 'Running...';
    const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  return (
    <Dialog open={!!executionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              Execution Details
              {execution && (
                <Badge variant={getStatusVariant(execution.status)}>
                  {execution.status}
                </Badge>
              )}
            </DialogTitle>
            {execution && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllData}
                className="gap-2 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </>
                )}
              </Button>
            )}
          </div>
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
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
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

              {/* Input - collapsible */}
              {execution.input !== undefined && execution.input !== null ? (
                <CollapsibleSection title="Trigger Input" defaultOpen={false}>
                  <ScrollArea className="max-h-48 rounded-lg border">
                    <pre className="text-xs bg-muted p-3 whitespace-pre-wrap break-all">
                      {JSON.stringify(execution.input, null, 2)}
                    </pre>
                  </ScrollArea>
                </CollapsibleSection>
              ) : null}

              {/* Steps */}
              <div>
                <div className="text-sm font-medium mb-2">
                  Steps ({execution.steps?.length || 0})
                </div>
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
              </div>

              {/* Output - collapsible */}
              {execution.output !== undefined && execution.output !== null ? (
                <CollapsibleSection title="Final Output" defaultOpen={false}>
                  <ScrollArea className="max-h-48 rounded-lg border">
                    <pre className="text-xs bg-muted p-3 whitespace-pre-wrap break-all">
                      {JSON.stringify(execution.output, null, 2)}
                    </pre>
                  </ScrollArea>
                </CollapsibleSection>
              ) : null}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Execution not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
