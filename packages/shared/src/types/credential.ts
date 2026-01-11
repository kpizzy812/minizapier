// Credential types

export type CredentialType =
  | 'TELEGRAM'
  | 'SMTP'
  | 'HTTP_BASIC'
  | 'HTTP_BEARER'
  | 'HTTP_API_KEY'
  | 'DATABASE'
  | 'RESEND';

export interface TelegramCredentialData {
  botToken: string;
}

export interface SmtpCredentialData {
  host: string;
  port: number;
  user: string;
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
  key: string;
  headerName: string;
}

export interface DatabaseCredentialData {
  connectionString: string;
}

export interface ResendCredentialData {
  apiKey: string;
}

export type CredentialData =
  | TelegramCredentialData
  | SmtpCredentialData
  | HttpBasicCredentialData
  | HttpBearerCredentialData
  | HttpApiKeyCredentialData
  | DatabaseCredentialData
  | ResendCredentialData;

export interface Credential {
  id: string;
  userId: string;
  name: string;
  type: CredentialType;
  createdAt: string;
  updatedAt: string;
}

// Response type without sensitive data
export interface CredentialResponse {
  id: string;
  name: string;
  type: CredentialType;
  createdAt: string;
  updatedAt: string;
}
