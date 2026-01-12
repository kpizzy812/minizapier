import fullTestWorkflow from './full-test-workflow.json';
import emailTriggerWorkflow from './email-trigger-workflow.json';
import quickTestWorkflow from './quick-test-workflow.json';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredCredentials: string[];
  placeholders: Record<string, string>;
  definition: {
    nodes: unknown[];
    edges: unknown[];
  };
  triggerConfig?: {
    type: string;
    config: Record<string, string>;
  };
  testInstructions: {
    setup: string[];
    test: string[];
  };
}

export const templates: WorkflowTemplate[] = [
  quickTestWorkflow as WorkflowTemplate,
  fullTestWorkflow as WorkflowTemplate,
  emailTriggerWorkflow as WorkflowTemplate,
];

export const getTemplateById = (id: string): WorkflowTemplate | undefined => {
  return templates.find((t) => t.id === id);
};

export const getTemplatesByCategory = (category: string): WorkflowTemplate[] => {
  return templates.filter((t) => t.category === category);
};

export { quickTestWorkflow, fullTestWorkflow, emailTriggerWorkflow };
