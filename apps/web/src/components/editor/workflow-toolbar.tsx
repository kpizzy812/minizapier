'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Play, Pause, ArrowLeft, AlertTriangle, Loader2, Undo2, Redo2, Power, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useCreateWorkflow, useUpdateWorkflow, useTestWorkflow, useWorkflow, useToggleWorkflowActive } from '@/hooks/use-workflows';
import { validateWorkflow, ValidationResult } from '@/lib/workflow-validator';
import { WorkflowSettingsDialog } from './workflow-settings-dialog';

interface WorkflowToolbarProps {
  workflowId?: string;
  onTestExecutionStart?: (executionId: string) => void;
}

export function WorkflowToolbar({ workflowId, onTestExecutionStart }: WorkflowToolbarProps) {
  const router = useRouter();
  const { workflowName, setWorkflowName, setWorkflowId, nodes, edges, undo, redo, canUndo, canRedo } =
    useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const testWorkflow = useTestWorkflow();
  const { data: workflow } = useWorkflow(workflowId);
  const toggleActive = useToggleWorkflowActive();

  const isSaving = createWorkflow.isPending || updateWorkflow.isPending;
  const isTesting = testWorkflow.isPending;
  const isToggling = toggleActive.isPending;
  const isActive = workflow?.isActive ?? false;

  // Keyboard shortcuts for undo/redo
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if user is typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleValidate = (): ValidationResult => {
    const result = validateWorkflow(
      nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      }))
    );
    setValidation(result);
    return result;
  };

  const handleSave = async () => {
    // Validate before saving
    const result = handleValidate();

    if (!result.isValid) {
      // Show all errors
      result.errors.forEach((error) => {
        toast.error(error.message);
      });
      return;
    }

    // Show warnings but continue
    result.warnings.forEach((warning) => {
      toast.warning(warning.message);
    });

    const definition = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
    };

    try {
      if (workflowId) {
        // Update existing workflow
        await updateWorkflow.mutateAsync({
          id: workflowId,
          input: { name: workflowName, definition },
        });
        toast.success('Workflow saved successfully');
      } else {
        // Create new workflow
        const newWorkflow = await createWorkflow.mutateAsync({
          name: workflowName,
          definition,
        });
        setWorkflowId(newWorkflow.id);
        // Navigate to the new workflow URL
        router.replace(`/editor/${newWorkflow.id}`);
        toast.success('Workflow created successfully');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save workflow'
      );
    }
  };

  const handleTest = async () => {
    // Validate before testing
    const result = handleValidate();

    if (!result.isValid) {
      result.errors.forEach((error) => {
        toast.error(error.message);
      });
      return;
    }

    // Workflow must be saved first
    if (!workflowId) {
      toast.error('Please save the workflow before testing');
      return;
    }

    try {
      const execution = await testWorkflow.mutateAsync({
        id: workflowId,
        testData: { test: true, timestamp: new Date().toISOString() },
      });

      toast.success('Test execution started');
      onTestExecutionStart?.(execution.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to start test execution'
      );
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleToggleActive = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      await toggleActive.mutateAsync({ id: workflowId, isActive: !isActive });
      toast.success(isActive ? 'Workflow paused' : 'Workflow activated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update workflow status'
      );
    }
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} title="Back to workflows">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {isEditing ? (
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="h-8 w-64"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-lg font-semibold hover:text-primary"
          >
            {workflowName}
          </button>
        )}

        <Badge variant="outline">{workflowId ? 'Saved' : 'New'}</Badge>
      </div>

      {/* Center section - stats & validation */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} connections</span>
        {validation && !validation.isValid && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {validation.errors.length} error
            {validation.errors.length !== 1 ? 's' : ''}
          </span>
        )}
        {validation &&
          validation.isValid &&
          validation.warnings.length > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              {validation.warnings.length} warning
              {validation.warnings.length !== 1 ? 's' : ''}
            </span>
          )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo buttons */}
        <div className="flex items-center border-r pr-2 mr-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
            className="h-8 w-8"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (Ctrl+Shift+Z)"
            className="h-8 w-8"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          disabled={!workflowId}
          title={!workflowId ? 'Save workflow first' : 'Workflow settings'}
          className="h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggleActive}
          disabled={isToggling || !workflowId}
          title={!workflowId ? 'Save workflow first' : isActive ? 'Pause workflow' : 'Activate workflow'}
        >
          {isToggling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isActive ? (
            <Pause className="mr-2 h-4 w-4" />
          ) : (
            <Power className="mr-2 h-4 w-4" />
          )}
          {isToggling ? 'Updating...' : isActive ? 'Active' : 'Inactive'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={isTesting || !workflowId}
          title={!workflowId ? 'Save workflow first to test' : undefined}
        >
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isTesting ? 'Starting...' : 'Test'}
        </Button>

        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Workflow Settings Dialog */}
      {workflowId && (
        <WorkflowSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workflowId={workflowId}
          workflowName={workflowName}
          notificationEmail={workflow?.notificationEmail}
        />
      )}
    </div>
  );
}
