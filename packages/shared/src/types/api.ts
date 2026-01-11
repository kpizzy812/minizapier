// API request/response types

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Workflow API
export interface CreateWorkflowDto {
  name: string;
  description?: string;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  definition?: unknown;
  isActive?: boolean;
}

// Credential API
export interface CreateCredentialDto {
  name: string;
  type: string;
  data: Record<string, unknown>;
}

export interface UpdateCredentialDto {
  name?: string;
  data?: Record<string, unknown>;
}
