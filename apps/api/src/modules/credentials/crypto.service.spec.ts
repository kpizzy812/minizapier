// Mock Prisma client before importing (required for NestJS Test module)
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: { InputJsonValue: {} },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    configService = module.get(ConfigService);
  });

  describe('onModuleInit', () => {
    it('should use random key when ENCRYPTION_KEY not set', () => {
      configService.get.mockReturnValue(undefined);

      // Should not throw
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should parse 64-char hex key', () => {
      const hexKey = 'a'.repeat(64);
      configService.get.mockReturnValue(hexKey);

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should parse 44-char base64 key', () => {
      const base64Key = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=';
      configService.get.mockReturnValue(base64Key);

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should parse 32-char raw string key', () => {
      const rawKey = '12345678901234567890123456789012';
      configService.get.mockReturnValue(rawKey);

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should hash key with invalid length', () => {
      const invalidKey = 'short-key';
      configService.get.mockReturnValue(invalidKey);

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('encrypt and decrypt', () => {
    beforeEach(() => {
      // Use a valid hex key for testing
      configService.get.mockReturnValue('a'.repeat(64));
      service.onModuleInit();
    });

    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt an object', () => {
      const data = { username: 'admin', password: 'secret123' };

      const encrypted = service.encrypt(data);
      const decrypted = service.decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same message';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should throw on invalid ciphertext format', () => {
      expect(() => service.decrypt('invalid')).toThrow(
        'Failed to decrypt data',
      );
    });

    it('should throw on tampered ciphertext', () => {
      const plaintext = 'Secret data';
      const encrypted = service.encrypt(plaintext);

      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      parts[2] = 'tampered' + parts[2];
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should handle empty string', () => {
      const plaintext = '';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Привет мир! 🚀 日本語';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', () => {
      const plaintext = 'x'.repeat(10000);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptJson and decryptJson', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('a'.repeat(64));
      service.onModuleInit();
    });

    it('should encrypt and decrypt JSON objects', () => {
      const data = {
        apiKey: 'sk-123456',
        endpoint: 'https://api.example.com',
        settings: { timeout: 5000, retries: 3 },
      };

      const encrypted = service.encryptJson(data);
      const decrypted = service.decryptJson<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('should handle nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const encrypted = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('should handle arrays', () => {
      const data = {
        items: [1, 2, 3],
        mixed: [{ a: 1 }, 'string', null, true],
      };

      const encrypted = service.encryptJson(data);
      const decrypted = service.decryptJson(encrypted);

      expect(decrypted).toEqual(data);
    });
  });

  describe('generateKey', () => {
    it('should generate a 64-character hex key', () => {
      const key = CryptoService.generateKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = CryptoService.generateKey();
      const key2 = CryptoService.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('cross-key decryption', () => {
    it('should fail to decrypt with different key', () => {
      // Encrypt with first key
      configService.get.mockReturnValue('a'.repeat(64));
      service.onModuleInit();
      const encrypted = service.encrypt('secret');

      // Try to decrypt with different key
      configService.get.mockReturnValue('b'.repeat(64));
      service.onModuleInit();

      expect(() => service.decrypt(encrypted)).toThrow(
        'Failed to decrypt data',
      );
    });
  });
});
