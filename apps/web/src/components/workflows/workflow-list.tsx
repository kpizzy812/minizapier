'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Workflow, MoreVertical, Trash2, Copy, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useWorkflows,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useToggleWorkflowActive,
} from '@/hooks/use-workflows';

export function WorkflowList() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();
  const duplicateWorkflow = useDuplicateWorkflow();
  const toggleActive = useToggleWorkflowActive();
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      await deleteWorkflow.mutateAsync(deleteDialog.id);
      toast.success('Workflow deleted');
    } catch {
      toast.error('Failed to delete workflow');
    } finally {
      setDeleteDialog(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateWorkflow.mutateAsync(id);
      toast.success('Workflow duplicated');
    } catch {
      toast.error('Failed to duplicate workflow');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await toggleActive.mutateAsync({ id, isActive: !currentState });
      toast.success(currentState ? 'Workflow deactivated' : 'Workflow activated');
    } catch {
      toast.error('Failed to update workflow');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading workflows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-destructive">Unable to load workflows</CardTitle>
          <CardDescription>
            Please check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>No workflows yet</CardTitle>
          <CardDescription>
            Create your first workflow to start automating tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/editor">
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="group relative">
          <Link href={`/editor/${workflow.id}`} className="absolute inset-0 z-0" />

          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="line-clamp-1">{workflow.name}</CardTitle>
                {workflow.description && (
                  <CardDescription className="line-clamp-2 mt-1">
                    {workflow.description}
                  </CardDescription>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10 h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                    title="Workflow actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(workflow.id, workflow.isActive);
                    }}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    {workflow.isActive ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(workflow.id);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialog({ id: workflow.id, name: workflow.name });
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <span className="leading-none">v{workflow.version}</span>
              </div>
              <span className="leading-none">
                {formatDistanceToNow(new Date(workflow.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Delete confirmation dialog */}
    <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{deleteDialog?.name}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
