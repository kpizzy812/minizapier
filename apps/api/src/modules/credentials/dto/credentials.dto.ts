import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
} from 'class-validator';

/**
 * Credential types matching Prisma enum
 */
export enum CredentialType {
  TELEGRAM = 'TELEGRAM',
  SMTP = 'SMTP',
  HTTP_BASIC = 'HTTP_BASIC',
  HTTP_BEARER = 'HTTP_BEARER',
  HTTP_API_KEY = 'HTTP_API_KEY',
  DATABASE = 'DATABASE',
  RESEND = 'RESEND',
}

/**
 * Credential data structures for each type
 */
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
  headerName?: string; // Default: X-API-Key
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

/**
 * DTO for creating a new credential
 */
export class CreateCredentialDto {
  @ApiProperty({
    description: 'Credential display name',
    example: 'My Telegram Bot',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: CredentialType, description: 'Type of credential' })
  @IsEnum(CredentialType)
  type!: CredentialType;

  @ApiProperty({
    description: 'Credential data (will be encrypted)',
    example: { botToken: 'your-bot-token' },
  })
  @IsObject()
  @IsNotEmpty()
  data!: CredentialData;
}

/**
 * DTO for updating a credential
 */
export class UpdateCredentialDto {
  @ApiPropertyOptional({ description: 'Credential display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Credential data (will be encrypted)',
    example: { botToken: 'new-bot-token' },
  })
  @IsObject()
  @IsOptional()
  data?: CredentialData;
}

/**
 * Response DTO for credential (without sensitive data)
 */
export class CredentialResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CredentialType })
  type!: CredentialType;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/**
 * Response DTO for credential with decrypted data (for internal use)
 */
export class CredentialWithDataDto extends CredentialResponseDto {
  @ApiProperty()
  data!: CredentialData;
}
