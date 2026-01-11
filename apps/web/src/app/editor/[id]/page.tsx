import { WorkflowEditor } from '@/components/editor';

interface WorkflowPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params;

  return <WorkflowEditor workflowId={id} />;
}
