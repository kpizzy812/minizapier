import Link from 'next/link';
import { Plus, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkflowList } from '@/components/workflows/workflow-list';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MiniZapier</span>
          </div>
          <Button asChild>
            <Link href="/editor">
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            Automate your tasks with visual workflows
          </p>
        </div>

        <WorkflowList />
      </main>
    </div>
  );
}
