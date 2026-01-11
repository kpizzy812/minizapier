// Create shared mock that persists across test
const mockEmailsSend = jest.fn();

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailsSend,
    },
  })),
  CreateEmailOptions: {},
}));

import { SendEmailAction } from './send-email.action';
import { Resend } from 'resend';

describe('SendEmailAction', () => {
  let service: SendEmailAction;

  beforeEach(() => {
    service = new SendEmailAction();
    mockEmailsSend.mockClear();
    (Resend as jest.Mock).mockClear();
  });

  describe('execute - validation', () => {
    it('should return error when apiKey is missing', async () => {
      const result = await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key is required');
    });
  });

  describe('execute - successful sending', () => {
    beforeEach(() => {
      mockEmailsSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });
    });

    it('should send email to single recipient', async () => {
      const result = await service.execute({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
        apiKey: 're_test_key',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'email-123',
        to: ['recipient@example.com'],
      });
    });

    it('should send email to multiple recipients', async () => {
      const result = await service.execute({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Multi-recipient',
        body: 'Hello all',
        apiKey: 're_test_key',
      });

      expect(result.success).toBe(true);
      expect(result.data?.to).toEqual([
        'user1@example.com',
        'user2@example.com',
      ]);
    });

    it('should use custom from address', async () => {
      await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Body',
        from: 'Custom <custom@domain.com>',
        apiKey: 're_test_key',
      });

      expect(Resend).toHaveBeenCalledWith('re_test_key');
    });

    it('should send as HTML when html flag is true', async () => {
      await service.execute({
        to: 'test@example.com',
        subject: 'HTML Email',
        body: '<h1>Hello</h1><p>World</p>',
        html: true,
        apiKey: 're_test_key',
      });

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Hello</h1><p>World</p>',
        }),
      );
    });

    it('should send as plain text by default', async () => {
      await service.execute({
        to: 'test@example.com',
        subject: 'Plain Email',
        body: 'Plain text content',
        apiKey: 're_test_key',
      });

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text content',
        }),
      );
    });

    it('should include replyTo when provided', async () => {
      await service.execute({
        to: 'test@example.com',
        subject: 'With Reply-To',
        body: 'Content',
        replyTo: 'reply@example.com',
        apiKey: 're_test_key',
      });

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply@example.com',
        }),
      );
    });
  });

  describe('execute - error handling', () => {
    it('should return error when Resend API returns error', async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key', name: 'validation_error' },
      });

      const result = await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Content',
        apiKey: 'invalid_key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle network errors', async () => {
      mockEmailsSend.mockRejectedValue(new Error('Network error'));

      const result = await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Content',
        apiKey: 're_test_key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      mockEmailsSend.mockRejectedValue('String error');

      const result = await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Content',
        apiKey: 're_test_key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('should handle missing email id in response', async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Content',
        apiKey: 're_test_key',
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('');
    });
  });

  describe('execute - default values', () => {
    beforeEach(() => {
      mockEmailsSend.mockResolvedValue({
        data: { id: 'email-456' },
        error: null,
      });
    });

    it('should use default from address when not provided', async () => {
      await service.execute({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Content',
        apiKey: 're_test_key',
      });

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'MiniZapier <onboarding@resend.dev>',
        }),
      );
    });
  });
});
