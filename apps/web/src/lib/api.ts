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
  notificationEmail?: string;
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
  notificationEmail?: string | null;
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

// Credential types
export type CredentialType =
  | 'TELEGRAM'
  | 'SMTP'
  | 'HTTP_BASIC'
  | 'HTTP_BEARER'
  | 'HTTP_API_KEY'
  | 'DATABASE'
  | 'RESEND'
  | 'AI';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramCredentialData {
  botToken: string;
}

export interface SmtpCredentialData {
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
}

export interface HttpBasicCredentialData {
  username: string;
  password: string;
}

export interface HttpBearerCredentialData {
  token: string;
}

export interface HttpApiKeyCredentialData {
  apiKey: string;
  headerName?: string;
}

export interface DatabaseCredentialData {
  connectionString: string;
}

export interface ResendCredentialData {
  apiKey: string;
}

export interface AICredentialData {
  apiKey: string;
  baseUrl?: string; // Default: https://api.openai.com/v1
  model?: string; // Default: gpt-4o-mini
}

export type CredentialData =
  | TelegramCredentialData
  | SmtpCredentialData
  | HttpBasicCredentialData
  | HttpBearerCredentialData
  | HttpApiKeyCredentialData
  | DatabaseCredentialData
  | ResendCredentialData
  | AICredentialData;

export interface CreateCredentialInput {
  name: string;
  type: CredentialType;
  data: CredentialData;
}

export interface UpdateCredentialInput {
  name?: string;
  data?: CredentialData;
}

export interface CredentialTestResult {
  success: boolean;
  message: string;
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

  async testWorkflow(id: string, testData?: unknown): Promise<Execution> {
    const response = await this.request<ApiResponse<Execution>>(
      `/workflows/${id}/test`,
      {
        method: 'POST',
        body: JSON.stringify({ testData }),
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

  // Credentials API
  async getCredentials(): Promise<Credential[]> {
    const response = await this.request<ApiResponse<Credential[]>>('/credentials');
    return response.data;
  }

  async getCredential(id: string): Promise<Credential> {
    const response = await this.request<ApiResponse<Credential>>(`/credentials/${id}`);
    return response.data;
  }

  async createCredential(input: CreateCredentialInput): Promise<Credential> {
    const response = await this.request<ApiResponse<Credential>>('/credentials', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async updateCredential(id: string, input: UpdateCredentialInput): Promise<Credential> {
    const response = await this.request<ApiResponse<Credential>>(`/credentials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async deleteCredential(id: string): Promise<void> {
    await this.request(`/credentials/${id}`, {
      method: 'DELETE',
    });
  }

  async testCredential(id: string): Promise<CredentialTestResult> {
    return this.request<CredentialTestResult>(`/credentials/${id}/test`, {
      method: 'POST',
    });
  }

  // AI API
  async testAIStream(
    credentialId: string,
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void,
    onError?: (error: string) => void,
    onDone?: () => void
  ): Promise<void> {
    const authHeaders = await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}/ai/test/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        credentialId,
        prompt,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk' && parsed.content && onChunk) {
                onChunk(parsed.content);
              } else if (parsed.type === 'error' && onError) {
                onError(parsed.error);
              } else if (parsed.type === 'done' && onDone) {
                onDone();
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async testAI(
    credentialId: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return this.request<{ success: boolean; data?: unknown; error?: string }>('/ai/test', {
      method: 'POST',
      body: JSON.stringify({
        credentialId,
        prompt,
        systemPrompt,
      }),
    });
  }
}

export const api = new ApiClient(API_URL);
