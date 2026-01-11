'use client';

import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { NodePalette, DnDProvider } from './sidebar';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowToolbar } from './workflow-toolbar';
import { NodePropertiesPanel } from './properties';
import { useWorkflow } from '@/hooks/use-workflows';
import { useWorkflowStore, WorkflowNode } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Edge } from '@xyflow/react';

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

  // Load workflow data when available
  useEffect(() => {
    if (workflow) {
      setWorkflowId(workflow.id);
      setWorkflowName(workflow.name);
      setNodes(workflow.definition.nodes as WorkflowNode[]);
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

  return (
    <ReactFlowProvider>
      <DnDProvider>
        <div className="flex h-screen w-full flex-col">
          {/* Toolbar */}
          <WorkflowToolbar workflowId={workflowId} />

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
            {rightSidebarOpen && <NodePropertiesPanel />}
          </div>
        </div>
      </DnDProvider>
    </ReactFlowProvider>
  );
}
