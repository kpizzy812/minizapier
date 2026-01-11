'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Play, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStore } from '@/stores/workflow-store';

interface WorkflowToolbarProps {
  workflowId?: string;
}

export function WorkflowToolbar({ workflowId }: WorkflowToolbarProps) {
  const router = useRouter();
  const { workflowName, setWorkflowName, nodes, edges } = useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save to API
      console.log('Saving workflow:', {
        id: workflowId,
        name: workflowName,
        definition: { nodes, edges },
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    // TODO: Implement test execution
    console.log('Testing workflow');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
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

        <Badge variant="outline">
          {workflowId ? 'Draft' : 'New'}
        </Badge>
      </div>

      {/* Center section - stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} connections</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleTest}>
          <Play className="mr-2 h-4 w-4" />
          Test
        </Button>

        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>

        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
