import { Test, TestingModule } from '@nestjs/testing';
import { WebhookTriggerService } from './webhook-trigger.service';

describe('WebhookTriggerService', () => {
  let service: WebhookTriggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookTriggerService],
    }).compile();

    service = module.get<WebhookTriggerService>(WebhookTriggerService);
  });

  describe('generateWebhookToken', () => {
    it('should generate a unique token', () => {
      const token1 = service.generateWebhookToken();
      const token2 = service.generateWebhookToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
    });

    it('should generate base64url encoded token', () => {
      const token = service.generateWebhookToken();
      // Base64url uses only alphanumeric, _, and - characters
      expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should generate 32-character token', () => {
      const token = service.generateWebhookToken();
      // 24 bytes encoded in base64url = 32 characters
      expect(token).toHaveLength(32);
    });
  });

  describe('generateWebhookUrl', () => {
    it('should generate URL with default base', () => {
      const token = 'test-token-123';
      const url = service.generateWebhookUrl(token);

      expect(url).toContain('/webhooks/test-token-123');
    });

    it('should use provided base URL', () => {
      const token = 'abc123';
      const baseUrl = 'https://api.example.com';
      const url = service.generateWebhookUrl(token, baseUrl);

      expect(url).toBe('https://api.example.com/webhooks/abc123');
    });
  });

  describe('generateSecret', () => {
    it('should generate a hex secret', () => {
      const secret = service.generateSecret();

      expect(secret).toBeDefined();
      expect(secret).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate 64-character secret', () => {
      const secret = service.generateSecret();
      // 32 bytes in hex = 64 characters
      expect(secret).toHaveLength(64);
    });

    it('should generate unique secrets', () => {
      const secret1 = service.generateSecret();
      const secret2 = service.generateSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('createSignature', () => {
    it('should create HMAC-SHA256 signature', () => {
      const payload = '{"data":"test"}';
      const secret = 'my-secret-key';
      const signature = service.createSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it('should create consistent signatures for same payload and secret', () => {
      const payload = '{"data":"test"}';
      const secret = 'my-secret-key';
      const sig1 = service.createSignature(payload, secret);
      const sig2 = service.createSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it('should create different signatures for different payloads', () => {
      const secret = 'my-secret-key';
      const sig1 = service.createSignature('payload1', secret);
      const sig2 = service.createSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different secrets', () => {
      const payload = 'same-payload';
      const sig1 = service.createSignature(payload, 'secret1');
      const sig2 = service.createSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"data":"test"}';
      const secret = 'my-secret-key';
      const signature = service.createSignature(payload, secret);

      expect(service.verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"data":"test"}';
      const secret = 'my-secret-key';

      expect(service.verifySignature(payload, 'sha256=invalid', secret)).toBe(
        false,
      );
    });

    it('should reject tampered payload', () => {
      const originalPayload = '{"data":"test"}';
      const secret = 'my-secret-key';
      const signature = service.createSignature(originalPayload, secret);

      const tamperedPayload = '{"data":"hacked"}';
      expect(service.verifySignature(tamperedPayload, signature, secret)).toBe(
        false,
      );
    });

    it('should reject wrong secret', () => {
      const payload = '{"data":"test"}';
      const signature = service.createSignature(payload, 'correct-secret');

      expect(service.verifySignature(payload, signature, 'wrong-secret')).toBe(
        false,
      );
    });

    it('should handle mismatched signature lengths', () => {
      const payload = '{"data":"test"}';
      const secret = 'my-secret-key';

      expect(service.verifySignature(payload, 'sha256=short', secret)).toBe(
        false,
      );
    });
  });

  describe('extractTokenFromUrl', () => {
    it('should extract token from valid URL', () => {
      const url = 'https://api.example.com/webhooks/abc123_XYZ-456';
      const token = service.extractTokenFromUrl(url);

      expect(token).toBe('abc123_XYZ-456');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://api.example.com/invalid/path';
      const token = service.extractTokenFromUrl(url);

      expect(token).toBeNull();
    });

    it('should handle URL with trailing slash', () => {
      const url = 'https://api.example.com/webhooks/token123';
      const token = service.extractTokenFromUrl(url);

      expect(token).toBe('token123');
    });
  });

  describe('isValidToken', () => {
    it('should validate correct token format', () => {
      const token = service.generateWebhookToken();

      expect(service.isValidToken(token)).toBe(true);
    });

    it('should reject short tokens', () => {
      expect(service.isValidToken('short')).toBe(false);
    });

    it('should reject tokens with invalid characters', () => {
      expect(service.isValidToken('invalid!@#$%^&*()token123')).toBe(false);
    });

    it('should reject empty tokens', () => {
      expect(service.isValidToken('')).toBe(false);
    });
  });

  describe('buildTriggerData', () => {
    it('should build trigger data with all fields', () => {
      const body = { key: 'value' };
      const headers = { 'content-type': 'application/json' };
      const query = { param: 'test' };
      const method = 'POST';

      const data = service.buildTriggerData(body, headers, query, method);

      expect(data.body).toEqual(body);
      expect(data.headers).toBeDefined();
      expect(data.query).toEqual(query);
      expect(data.method).toBe('POST');
      expect(data.timestamp).toBeDefined();
    });

    it('should sanitize sensitive headers', () => {
      const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token',
        cookie: 'session=abc123',
        'x-api-key': 'my-api-key',
        'x-auth-token': 'auth-token',
      };

      const data = service.buildTriggerData({}, headers, {}, 'POST');
      const sanitizedHeaders = data.headers as Record<string, string>;

      expect(sanitizedHeaders['content-type']).toBe('application/json');
      expect(sanitizedHeaders['authorization']).toBe('[REDACTED]');
      expect(sanitizedHeaders['cookie']).toBe('[REDACTED]');
      expect(sanitizedHeaders['x-api-key']).toBe('[REDACTED]');
      expect(sanitizedHeaders['x-auth-token']).toBe('[REDACTED]');
    });

    it('should add ISO timestamp', () => {
      const data = service.buildTriggerData({}, {}, {}, 'GET');

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
