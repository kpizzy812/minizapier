'use client';

import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { NodePalette, DnDProvider } from './sidebar';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowToolbar } from './workflow-toolbar';
import { NodePropertiesPanel } from './properties';
import { TestExecutionPanel } from './test-execution-panel';
import { useWorkflow, useTestWorkflow } from '@/hooks/use-workflows';
import { useWorkflowStore, WorkflowNode } from '@/stores/workflow-store';
import { useExecutionSocket, useExecutionStatusStore } from '@/hooks/use-execution-socket';
import { Button } from '@/components/ui/button';
import { Edge } from '@xyflow/react';
import { toast } from 'sonner';

interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const { setWorkflowId, setWorkflowName, setNodes, setEdges, resetWorkflow } =
    useWorkflowStore();

  // Sidebar visibility state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Test execution state
  const [testExecutionId, setTestExecutionId] = useState<string | null>(null);
  const testWorkflow = useTestWorkflow();

  // WebSocket connection for real-time execution updates
  useExecutionSocket(testExecutionId);
  const clearNodeStatuses = useExecutionStatusStore((state) => state.clearNodeStatuses);

  // Load workflow data when available
  useEffect(() => {
    if (workflow) {
      setWorkflowId(workflow.id);
      setWorkflowName(workflow.name);

      // Enrich nodes with trigger data
      let nodes = workflow.definition.nodes as WorkflowNode[];

      // If workflow has trigger, inject trigger data into matching node
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trigger = (workflow as any).trigger as { type: string; config: Record<string, unknown>; webhookUrl?: string } | null;
      if (trigger) {
        nodes = nodes.map((node) => {
          // Match trigger type to node type
          const triggerTypeToNodeType: Record<string, string> = {
            WEBHOOK: 'webhookTrigger',
            EMAIL: 'emailTrigger',
            SCHEDULE: 'scheduleTrigger',
          };

          if (node.type === triggerTypeToNodeType[trigger.type]) {
            // Inject trigger config into node data
            return {
              ...node,
              data: {
                ...node.data,
                ...trigger.config,
                // Also inject webhookUrl for webhook triggers
                ...(trigger.webhookUrl && { webhookUrl: trigger.webhookUrl }),
              },
            };
          }
          return node;
        });
      }

      setNodes(nodes);
      setEdges(workflow.definition.edges as Edge[]);
    } else if (!workflowId) {
      // Reset for new workflow
      resetWorkflow();
    }
  }, [
    workflow,
    workflowId,
    setWorkflowId,
    setWorkflowName,
    setNodes,
    setEdges,
    resetWorkflow,
  ]);

  if (workflowId && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  const handleTestExecutionStart = (executionId: string) => {
    setTestExecutionId(executionId);
  };

  const handleTestPanelClose = () => {
    setTestExecutionId(null);
    // Clear node highlighting when closing test panel
    clearNodeStatuses();
  };

  const handleRerunTest = async () => {
    if (!workflowId) return;

    try {
      clearNodeStatuses();
      const execution = await testWorkflow.mutateAsync({
        id: workflowId,
        testData: { test: true, timestamp: new Date().toISOString() },
      });
      setTestExecutionId(execution.id);
      toast.success('Test execution started');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to start test execution'
      );
    }
  };

  return (
    <ReactFlowProvider>
      <DnDProvider>
        <div className="flex h-screen w-full flex-col">
          {/* Toolbar */}
          <WorkflowToolbar
            workflowId={workflowId}
            onTestExecutionStart={handleTestExecutionStart}
          />

          {/* Main content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Node Palette */}
            {leftSidebarOpen && <NodePalette />}

            {/* Canvas with toggle buttons */}
            <div className="relative flex-1">
              {/* Left toggle button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                title={leftSidebarOpen ? 'Hide node palette' : 'Show node palette'}
              >
                {leftSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>

              {/* Right toggle button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                title={rightSidebarOpen ? 'Hide properties panel' : 'Show properties panel'}
              >
                {rightSidebarOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>

              <WorkflowCanvas />
            </div>

            {/* Right Sidebar - Properties Panel */}
            {rightSidebarOpen && !testExecutionId && <NodePropertiesPanel />}

            {/* Test Execution Panel - shown instead of properties when testing */}
            {testExecutionId && (
              <TestExecutionPanel
                executionId={testExecutionId}
                onClose={handleTestPanelClose}
                onRerun={handleRerunTest}
              />
            )}
          </div>
        </div>
      </DnDProvider>
    </ReactFlowProvider>
  );
}
