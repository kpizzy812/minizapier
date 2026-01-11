import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { EmailTriggerService } from './email-trigger.service';

describe('EmailTriggerService', () => {
  let service: EmailTriggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTriggerService],
    }).compile();

    service = module.get<EmailTriggerService>(EmailTriggerService);
  });

  describe('generateEmailAddress', () => {
    it('should generate unique email addresses', () => {
      const email1 = service.generateEmailAddress();
      const email2 = service.generateEmailAddress();

      expect(email1).not.toBe(email2);
    });

    it('should use provided domain', () => {
      const email = service.generateEmailAddress('custom.domain.com');

      expect(email).toContain('@custom.domain.com');
    });

    it('should start with trigger- prefix', () => {
      const email = service.generateEmailAddress();

      expect(email).toMatch(/^trigger-[a-f0-9]+@/);
    });

    it('should generate hex token', () => {
      const email = service.generateEmailAddress('test.com');
      const match = email.match(/^trigger-([a-f0-9]+)@/);

      expect(match).not.toBeNull();
      expect(match![1]).toHaveLength(24); // 12 bytes = 24 hex chars
    });
  });

  describe('extractTokenFromAddress', () => {
    it('should extract token from valid email', () => {
      const token = service.extractTokenFromAddress(
        'trigger-abc123def456@domain.com',
      );

      expect(token).toBe('abc123def456');
    });

    it('should return null for invalid email format', () => {
      expect(service.extractTokenFromAddress('invalid@domain.com')).toBeNull();
      expect(
        service.extractTokenFromAddress('random-email@test.com'),
      ).toBeNull();
    });

    it('should be case insensitive', () => {
      const token = service.extractTokenFromAddress(
        'TRIGGER-ABC123@domain.com',
      );

      expect(token).toBe('ABC123');
    });
  });

  describe('isValidEmailAddress', () => {
    it('should validate correct email addresses', () => {
      expect(service.isValidEmailAddress('test@example.com')).toBe(true);
      expect(service.isValidEmailAddress('user.name@domain.org')).toBe(true);
      expect(service.isValidEmailAddress('trigger-abc123@inbound.com')).toBe(
        true,
      );
    });

    it('should reject invalid email addresses', () => {
      expect(service.isValidEmailAddress('invalid')).toBe(false);
      expect(service.isValidEmailAddress('no-domain@')).toBe(false);
      expect(service.isValidEmailAddress('@no-local.com')).toBe(false);
      expect(service.isValidEmailAddress('spaces in@email.com')).toBe(false);
    });
  });

  describe('verifySendGridSignature', () => {
    it('should return false for invalid signature', () => {
      const result = service.verifySendGridSignature(
        'invalid-key',
        'payload',
        'invalid-signature',
        '1234567890',
      );

      expect(result).toBe(false);
    });

    it('should handle verification errors gracefully', () => {
      // Pass invalid data that will cause an error
      const result = service.verifySendGridSignature(
        '',
        'payload',
        'signature',
        'timestamp',
      );

      expect(result).toBe(false);
    });
  });

  describe('verifyMailgunSignature', () => {
    it('should verify valid Mailgun signature', () => {
      const apiKey = 'test-api-key';
      const timestamp = '1234567890';
      const token = 'random-token';

      // Create a valid signature using the same method Mailgun uses
      const hmac = createHmac('sha256', apiKey);
      hmac.update(timestamp + token);
      const validSignature = hmac.digest('hex');

      const result = service.verifyMailgunSignature(
        apiKey,
        timestamp,
        token,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const result = service.verifyMailgunSignature(
        'api-key',
        '12345',
        'token',
        'invalid-signature',
      );

      expect(result).toBe(false);
    });

    it('should reject mismatched length signatures', () => {
      const result = service.verifyMailgunSignature(
        'api-key',
        '12345',
        'token',
        'short',
      );

      expect(result).toBe(false);
    });
  });

  describe('parseSendGridPayload', () => {
    it('should parse SendGrid payload correctly', () => {
      const body = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text body',
        html: '<p>HTML body</p>',
        headers: 'From: sender@example.com\nTo: recipient@example.com',
      };

      const result = service.parseSendGridPayload(body);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('recipient@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.text).toBe('Plain text body');
      expect(result.html).toBe('<p>HTML body</p>');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle missing optional fields', () => {
      const body = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
      };

      const result = service.parseSendGridPayload(body);

      expect(result.text).toBeUndefined();
      expect(result.html).toBeUndefined();
    });

    it('should parse attachment info', () => {
      const body = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'With attachment',
        'attachment-info': JSON.stringify({
          attachment1: {
            filename: 'test.pdf',
            'content-type': 'application/pdf',
            size: 1024,
          },
        }),
      };

      const result = service.parseSendGridPayload(body);

      expect(result.attachments).toBeDefined();
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0].filename).toBe('test.pdf');
    });
  });

  describe('parseMailgunPayload', () => {
    it('should parse Mailgun payload correctly', () => {
      const body = {
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        subject: 'Test Subject',
        'body-plain': 'Plain text body',
        'body-html': '<p>HTML body</p>',
      };

      const result = service.parseMailgunPayload(body);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('recipient@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.text).toBe('Plain text body');
      expect(result.html).toBe('<p>HTML body</p>');
    });

    it('should handle alternative field names', () => {
      const body = {
        from: 'sender@example.com',
        To: 'recipient@example.com',
        Subject: 'Subject',
      };

      const result = service.parseMailgunPayload(body);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('recipient@example.com');
      expect(result.subject).toBe('Subject');
    });

    it('should parse message headers array', () => {
      const body = {
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        subject: 'Test',
        'message-headers': [
          ['Content-Type', 'text/plain'],
          ['From', 'sender@example.com'],
        ],
      };

      const result = service.parseMailgunPayload(body);

      expect(result.headers).toBeDefined();
      expect(result.headers!['Content-Type']).toBe('text/plain');
      expect(result.headers!['From']).toBe('sender@example.com');
    });

    it('should parse attachments count', () => {
      const body = {
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        subject: 'With attachment',
        'attachment-count': 2,
        'attachment-1': {
          filename: 'doc1.pdf',
          'content-type': 'application/pdf',
          size: 1024,
        },
        'attachment-2': {
          filename: 'doc2.pdf',
          'content-type': 'application/pdf',
          size: 2048,
        },
      };

      const result = service.parseMailgunPayload(body);

      expect(result.attachments).toBeDefined();
      expect(result.attachments).toHaveLength(2);
    });
  });

  describe('parseGenericPayload', () => {
    it('should parse various field name formats', () => {
      const body = {
        From: 'sender@example.com',
        Recipient: 'recipient@example.com',
        Subject: 'Test',
      };

      const result = service.parseGenericPayload(body);

      expect(result.from).toBe('sender@example.com');
      expect(result.to).toBe('recipient@example.com');
      expect(result.subject).toBe('Test');
    });

    it('should prioritize lowercase field names', () => {
      const body = {
        from: 'preferred@example.com',
        From: 'fallback@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
      };

      const result = service.parseGenericPayload(body);

      expect(result.from).toBe('preferred@example.com');
    });

    it('should handle body-plain and body-html', () => {
      const body = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        'body-plain': 'Plain text',
        'body-html': '<p>HTML</p>',
      };

      const result = service.parseGenericPayload(body);

      expect(result.text).toBe('Plain text');
      expect(result.html).toBe('<p>HTML</p>');
    });
  });

  describe('buildEmailTriggerData', () => {
    it('should build trigger data with email info', () => {
      const emailData = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = service.buildEmailTriggerData(emailData);

      expect(result.type).toBe('email');
      expect(result.email).toEqual(emailData);
      expect(result.timestamp).toBe(emailData.timestamp);
    });
  });
});
