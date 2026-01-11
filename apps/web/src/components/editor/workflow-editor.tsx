'use client';

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { NodePalette, DnDProvider } from './sidebar';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowToolbar } from './workflow-toolbar';
import { useWorkflow } from '@/hooks/use-workflows';
import { useWorkflowStore, WorkflowNode } from '@/stores/workflow-store';
import { Edge } from '@xyflow/react';

interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const { setWorkflowId, setWorkflowName, setNodes, setEdges, resetWorkflow } =
    useWorkflowStore();

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
            {/* Sidebar */}
            <NodePalette />

            {/* Canvas */}
            <div className="flex-1">
              <WorkflowCanvas />
            </div>
          </div>
        </div>
      </DnDProvider>
    </ReactFlowProvider>
  );
}
