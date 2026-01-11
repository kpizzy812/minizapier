// API client for MiniZapier backend

import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

// Execution types
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PAUSED';

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  workflow?: {
    id: string;
    name: string;
  };
}

export interface StepLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  status: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
  createdAt: string;
}

export interface ExecutionWithSteps extends Execution {
  steps: StepLog[];
}

export interface ExecutionStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  pending: number;
  averageDuration?: number;
}

export interface ListExecutionsParams {
  workflowId?: string;
  status?: ExecutionStatus;
  startedAfter?: string;
  startedBefore?: string;
  skip?: number;
  take?: number;
}

export interface PaginatedExecutions {
  executions: Execution[];
  total: number;
  skip: number;
  take: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }

    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
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

  // Executions API
  async getExecutions(params: ListExecutionsParams = {}): Promise<PaginatedExecutions> {
    const searchParams = new URLSearchParams();
    if (params.workflowId) searchParams.set('workflowId', params.workflowId);
    if (params.status) searchParams.set('status', params.status);
    if (params.startedAfter) searchParams.set('startedAfter', params.startedAfter);
    if (params.startedBefore) searchParams.set('startedBefore', params.startedBefore);
    if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params.take !== undefined) searchParams.set('take', String(params.take));

    const query = searchParams.toString();
    return this.request<PaginatedExecutions>(`/executions${query ? `?${query}` : ''}`);
  }

  async getExecution(id: string): Promise<ExecutionWithSteps> {
    return this.request<ExecutionWithSteps>(`/executions/${id}`);
  }

  async getExecutionLogs(id: string): Promise<StepLog[]> {
    return this.request<StepLog[]>(`/executions/${id}/logs`);
  }

  async getExecutionStats(workflowId?: string): Promise<ExecutionStats> {
    const query = workflowId ? `?workflowId=${workflowId}` : '';
    return this.request<ExecutionStats>(`/executions/stats${query}`);
  }

  async replayExecution(id: string): Promise<Execution> {
    return this.request<Execution>(`/executions/${id}/replay`, {
      method: 'POST',
    });
  }

  async cancelExecution(id: string): Promise<Execution> {
    return this.request<Execution>(`/executions/${id}/cancel`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_URL);
