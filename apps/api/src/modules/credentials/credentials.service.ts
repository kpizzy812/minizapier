import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import {
  CreateCredentialDto,
  UpdateCredentialDto,
  CredentialResponseDto,
  CredentialWithDataDto,
  CredentialData,
  CredentialType,
  TelegramCredentialData,
  ResendCredentialData,
  HttpBasicCredentialData,
  HttpBearerCredentialData,
  HttpApiKeyCredentialData,
  DatabaseCredentialData,
  AICredentialData,
} from './dto/credentials.dto';
import {
  Credential,
  CredentialType as PrismaCredentialType,
} from '../../../generated/prisma/client';

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Create a new credential
   */
  async create(
    userId: string,
    dto: CreateCredentialDto,
  ): Promise<CredentialResponseDto> {
    // Encrypt the credential data
    const encryptedData = this.crypto.encryptJson(dto.data);

    const credential = await this.prisma.credential.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type as PrismaCredentialType,
        data: encryptedData,
      },
    });

    return this.toResponseDto(credential);
  }

  /**
   * Find all credentials for a user (without sensitive data)
   */
  async findAll(userId: string): Promise<CredentialResponseDto[]> {
    const credentials = await this.prisma.credential.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return credentials.map((c) => this.toResponseDto(c));
  }

  /**
   * Find a credential by ID (without sensitive data)
   */
  async findOne(id: string, userId: string): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findFirst({
      where: { id, userId },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    return this.toResponseDto(credential);
  }

  /**
   * Find a credential by ID with decrypted data (for internal action execution)
   */
  async findOneWithData(
    id: string,
    userId: string,
  ): Promise<CredentialWithDataDto> {
    const credential = await this.prisma.credential.findFirst({
      where: { id, userId },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    return this.toResponseDtoWithData(credential);
  }

  /**
   * Get decrypted credential data by ID (for action execution)
   * Does not validate userId for internal use - use with caution
   */
  async getCredentialData(id: string): Promise<CredentialData> {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    return this.crypto.decryptJson<CredentialData>(credential.data);
  }

  /**
   * Update a credential
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateCredentialDto,
  ): Promise<CredentialResponseDto> {
    // Verify credential exists and belongs to user
    await this.findOne(id, userId);

    const updateData: { name?: string; data?: string } = {};

    if (dto.name) {
      updateData.name = dto.name;
    }

    if (dto.data) {
      updateData.data = this.crypto.encryptJson(dto.data);
    }

    const credential = await this.prisma.credential.update({
      where: { id },
      data: updateData,
    });

    return this.toResponseDto(credential);
  }

  /**
   * Delete a credential
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify credential exists and belongs to user
    await this.findOne(id, userId);

    await this.prisma.credential.delete({
      where: { id },
    });
  }

  /**
   * Test a credential connection
   */
  async testCredential(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const credential = await this.findOneWithData(id, userId);

    try {
      switch (credential.type) {
        case CredentialType.TELEGRAM:
          return await this.testTelegram(
            credential.data as TelegramCredentialData,
          );

        case CredentialType.RESEND:
          return await this.testResend(credential.data as ResendCredentialData);

        case CredentialType.DATABASE:
          return await this.testDatabase(
            credential.data as DatabaseCredentialData,
          );

        case CredentialType.HTTP_BASIC:
        case CredentialType.HTTP_BEARER:
        case CredentialType.HTTP_API_KEY:
          // HTTP credentials can't be tested without a specific endpoint
          return {
            success: true,
            message:
              'HTTP credentials saved. They will be tested when used in a workflow.',
          };

        case CredentialType.SMTP:
          // SMTP would require actually connecting to the server
          return {
            success: true,
            message:
              'SMTP credentials saved. They will be tested when sending an email.',
          };

        case CredentialType.AI:
          return await this.testAI(credential.data as AICredentialData);

        default:
          return {
            success: true,
            message: 'Credentials saved successfully.',
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Credential test failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Test Telegram bot token
   */
  private async testTelegram(
    data: TelegramCredentialData,
  ): Promise<{ success: boolean; message: string }> {
    const { Api } = await import('grammy');
    const api = new Api(data.botToken);

    try {
      const me = await api.getMe();
      return {
        success: true,
        message: `Connected to Telegram bot: @${me.username}`,
      };
    } catch (error) {
      throw new Error(
        `Telegram API error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Test Resend API key
   */
  private async testResend(
    data: ResendCredentialData,
  ): Promise<{ success: boolean; message: string }> {
    const { Resend } = await import('resend');
    const resend = new Resend(data.apiKey);

    try {
      // Get API keys list to verify the key works
      const { data: domains, error } = await resend.domains.list();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: `Connected to Resend. ${domains?.data?.length || 0} domains configured.`,
      };
    } catch (error) {
      throw new Error(
        `Resend API error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Test database connection
   */
  private async testDatabase(
    data: DatabaseCredentialData,
  ): Promise<{ success: boolean; message: string }> {
    const { Pool } = await import('pg');

    const pool = new Pool({
      connectionString: data.connectionString,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      const result = await client.query<{ version: string }>(
        'SELECT version()',
      );
      client.release();
      await pool.end();

      const version = result.rows[0]?.version ?? 'Unknown';
      const versionDisplay = String(version).substring(0, 50);
      return {
        success: true,
        message: `Connected to database: ${versionDisplay}...`,
      };
    } catch (error) {
      await pool.end().catch(() => {});
      throw new Error(
        `Database error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Test AI API connection (OpenAI-compatible)
   */
  private async testAI(
    data: AICredentialData,
  ): Promise<{ success: boolean; message: string }> {
    const baseUrl = data.baseUrl || 'https://api.openai.com/v1';
    const model = data.model || 'gpt-4o-mini';

    try {
      // Simple models list request to verify API key
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${data.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API returned ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: `Connected to AI API (${baseUrl}). Model: ${model}`,
      };
    } catch (error) {
      throw new Error(
        `AI API error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Convert Prisma model to response DTO (without sensitive data)
   */
  private toResponseDto(credential: Credential): CredentialResponseDto {
    return {
      id: credential.id,
      name: credential.name,
      type: credential.type as CredentialType,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  /**
   * Convert Prisma model to response DTO with decrypted data
   */
  private toResponseDtoWithData(credential: Credential): CredentialWithDataDto {
    return {
      ...this.toResponseDto(credential),
      data: this.crypto.decryptJson<CredentialData>(credential.data),
    };
  }

  /**
   * Helper to get auth config for HTTP requests from credential
   */
  async getHttpAuthConfig(credentialId: string): Promise<{
    type: 'basic' | 'bearer' | 'api_key';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    headerName?: string;
  } | null> {
    try {
      const credential = await this.prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (!credential) {
        return null;
      }

      const data = this.crypto.decryptJson<CredentialData>(credential.data);

      switch (credential.type) {
        case 'HTTP_BASIC': {
          const basicData = data as HttpBasicCredentialData;
          return {
            type: 'basic',
            username: basicData.username,
            password: basicData.password,
          };
        }

        case 'HTTP_BEARER': {
          const bearerData = data as HttpBearerCredentialData;
          return {
            type: 'bearer',
            token: bearerData.token,
          };
        }

        case 'HTTP_API_KEY': {
          const apiKeyData = data as HttpApiKeyCredentialData;
          return {
            type: 'api_key',
            apiKey: apiKeyData.apiKey,
            headerName: apiKeyData.headerName,
          };
        }

        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}
