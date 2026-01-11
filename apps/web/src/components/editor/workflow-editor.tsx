'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { NodePalette, DnDProvider } from './sidebar';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowToolbar } from './workflow-toolbar';

interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
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
