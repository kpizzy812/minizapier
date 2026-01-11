// API client for MiniZapier backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Temporary user ID until Supabase Auth is integrated
const TEMP_USER_ID = 'temp-user-id';

interface ApiResponse<T> {
  data: T;
  message?: string;
  total?: number;
}

interface WorkflowDefinition {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
  variables?: Record<string, string>;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  sampleData?: Record<string, unknown>;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  isActive?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEMP_USER_ID,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Workflows API
  async getWorkflows(): Promise<Workflow[]> {
    const response = await this.request<ApiResponse<Workflow[]>>('/workflows');
    return response.data;
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<ApiResponse<Workflow>>(
      `/workflows/${id}`
    );
    return response.data;
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    const response = await this.request<ApiResponse<Workflow>>('/workflows', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async updateWorkflow(
    id: string,
    input: UpdateWorkflowInput
  ): Promise<Workflow> {
    const response = await this.request<ApiResponse<Workflow>>(
      `/workflows/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
    return response.data;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.request(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<ApiResponse<Workflow>>(
      `/workflows/${id}/duplicate`,
      {
        method: 'POST',
      }
    );
    return response.data;
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<ApiResponse<Workflow>>(
      `/workflows/${id}/activate`,
      {
        method: 'POST',
      }
    );
    return response.data;
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<ApiResponse<Workflow>>(
      `/workflows/${id}/deactivate`,
      {
        method: 'POST',
      }
    );
    return response.data;
  }
}

export const api = new ApiClient(API_URL);
