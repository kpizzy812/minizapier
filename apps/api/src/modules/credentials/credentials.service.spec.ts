/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    credential: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
  Prisma: {
    InputJsonValue: {},
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

// Mock external services
jest.mock('grammy', () => ({
  Api: jest.fn().mockImplementation(() => ({
    getMe: jest.fn().mockResolvedValue({ username: 'test_bot' }),
  })),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    domains: {
      list: jest.fn().mockResolvedValue({ data: { data: [] }, error: null }),
    },
  })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest
        .fn()
        .mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] }),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CryptoService } from './crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialType } from './dto/credentials.dto';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let prisma: jest.Mocked<PrismaService>;
  let crypto: jest.Mocked<CryptoService>;

  const mockCredential = {
    id: 'cred-123',
    userId: 'user-123',
    name: 'Test Credential',
    type: 'TELEGRAM',
    data: 'encrypted-data',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      credential: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockCryptoService = {
      encrypt: jest.fn().mockReturnValue('encrypted-data'),
      decrypt: jest.fn().mockReturnValue('{"botToken":"test-token"}'),
      encryptJson: jest.fn().mockReturnValue('encrypted-json'),
      decryptJson: jest.fn().mockReturnValue({ botToken: 'test-token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    prisma = module.get(PrismaService);
    crypto = module.get(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a credential', async () => {
      prisma.credential.create.mockResolvedValue(mockCredential);

      const result = await service.create('user-123', {
        name: 'Test Credential',
        type: CredentialType.TELEGRAM,
        data: { botToken: 'test-token' },
      });

      expect(result).toEqual({
        id: 'cred-123',
        name: 'Test Credential',
        type: CredentialType.TELEGRAM,
        createdAt: mockCredential.createdAt,
        updatedAt: mockCredential.updatedAt,
      });
      expect(crypto.encryptJson).toHaveBeenCalledWith({
        botToken: 'test-token',
      });
    });
  });

  describe('findAll', () => {
    it('should return all credentials for a user', async () => {
      prisma.credential.findMany.mockResolvedValue([mockCredential]);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cred-123');
      expect(prisma.credential.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should return empty array when no credentials', async () => {
      prisma.credential.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a credential by id', async () => {
      prisma.credential.findFirst.mockResolvedValue(mockCredential);

      const result = await service.findOne('cred-123', 'user-123');

      expect(result.id).toBe('cred-123');
      expect(result.name).toBe('Test Credential');
    });

    it('should throw NotFoundException when credential not found', async () => {
      prisma.credential.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneWithData', () => {
    it('should return credential with decrypted data', async () => {
      prisma.credential.findFirst.mockResolvedValue(mockCredential);
      crypto.decryptJson.mockReturnValue({ botToken: 'decrypted-token' });

      const result = await service.findOneWithData('cred-123', 'user-123');

      expect(result.data).toEqual({ botToken: 'decrypted-token' });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.credential.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneWithData('missing', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCredentialData', () => {
    it('should return decrypted credential data by id', async () => {
      prisma.credential.findUnique.mockResolvedValue(mockCredential);
      crypto.decryptJson.mockReturnValue({ botToken: 'secret-token' });

      const result = await service.getCredentialData('cred-123');

      expect(result).toEqual({ botToken: 'secret-token' });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.credential.findUnique.mockResolvedValue(null);

      await expect(service.getCredentialData('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update credential name', async () => {
      prisma.credential.findFirst.mockResolvedValue(mockCredential);
      prisma.credential.update.mockResolvedValue({
        ...mockCredential,
        name: 'Updated Name',
      });

      const result = await service.update('cred-123', 'user-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should update credential data', async () => {
      prisma.credential.findFirst.mockResolvedValue(mockCredential);
      prisma.credential.update.mockResolvedValue(mockCredential);

      await service.update('cred-123', 'user-123', {
        data: { botToken: 'new-token' },
      });

      expect(crypto.encryptJson).toHaveBeenCalledWith({
        botToken: 'new-token',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.credential.findFirst.mockResolvedValue(null);

      await expect(
        service.update('missing', 'user-123', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a credential', async () => {
      prisma.credential.findFirst.mockResolvedValue(mockCredential);
      prisma.credential.delete.mockResolvedValue(mockCredential);

      await service.remove('cred-123', 'user-123');

      expect(prisma.credential.delete).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.credential.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('testCredential', () => {
    // Note: External API tests (Telegram, Resend, Database) are skipped
    // because they use dynamic imports which bypass Jest mocks.
    // These should be tested in integration tests.

    it('should return success for HTTP credentials without testing', async () => {
      prisma.credential.findFirst.mockResolvedValue({
        ...mockCredential,
        type: 'HTTP_BASIC',
      });
      crypto.decryptJson.mockReturnValue({
        username: 'user',
        password: 'pass',
      });

      const result = await service.testCredential('cred-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('HTTP credentials saved');
    });

    it('should return success for SMTP credentials without testing', async () => {
      prisma.credential.findFirst.mockResolvedValue({
        ...mockCredential,
        type: 'SMTP',
      });
      crypto.decryptJson.mockReturnValue({
        host: 'smtp.example.com',
        port: 587,
      });

      const result = await service.testCredential('cred-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('SMTP credentials saved');
    });
  });

  describe('getHttpAuthConfig', () => {
    it('should return basic auth config', async () => {
      prisma.credential.findUnique.mockResolvedValue({
        ...mockCredential,
        type: 'HTTP_BASIC',
      });
      crypto.decryptJson.mockReturnValue({
        username: 'admin',
        password: 'secret',
      });

      const result = await service.getHttpAuthConfig('cred-123');

      expect(result).toEqual({
        type: 'basic',
        username: 'admin',
        password: 'secret',
      });
    });

    it('should return bearer auth config', async () => {
      prisma.credential.findUnique.mockResolvedValue({
        ...mockCredential,
        type: 'HTTP_BEARER',
      });
      crypto.decryptJson.mockReturnValue({ token: 'jwt-token' });

      const result = await service.getHttpAuthConfig('cred-123');

      expect(result).toEqual({
        type: 'bearer',
        token: 'jwt-token',
      });
    });

    it('should return api key auth config', async () => {
      prisma.credential.findUnique.mockResolvedValue({
        ...mockCredential,
        type: 'HTTP_API_KEY',
      });
      crypto.decryptJson.mockReturnValue({
        apiKey: 'api-key-123',
        headerName: 'X-API-Key',
      });

      const result = await service.getHttpAuthConfig('cred-123');

      expect(result).toEqual({
        type: 'api_key',
        apiKey: 'api-key-123',
        headerName: 'X-API-Key',
      });
    });

    it('should return null for non-HTTP credential', async () => {
      prisma.credential.findUnique.mockResolvedValue({
        ...mockCredential,
        type: 'TELEGRAM',
      });

      const result = await service.getHttpAuthConfig('cred-123');

      expect(result).toBeNull();
    });

    it('should return null when credential not found', async () => {
      prisma.credential.findUnique.mockResolvedValue(null);

      const result = await service.getHttpAuthConfig('missing');

      expect(result).toBeNull();
    });

    it('should return null on decryption error', async () => {
      prisma.credential.findUnique.mockResolvedValue({
        ...mockCredential,
        type: 'HTTP_BASIC',
      });
      crypto.decryptJson.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getHttpAuthConfig('cred-123');

      expect(result).toBeNull();
    });
  });
});
