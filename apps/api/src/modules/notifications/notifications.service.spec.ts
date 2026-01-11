import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotificationsService,
  WorkflowErrorNotification,
} from './notifications.service';

// Email call args type
interface EmailCallArgs {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

// Mock Resend
const mockSend = jest.fn<
  Promise<{ data: { id: string } | null; error: { message: string } | null }>,
  [EmailCallArgs]
>();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

function getLastEmailCall(): EmailCallArgs {
  const calls = mockSend.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error('No calls recorded');
  return lastCall[0];
}

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotification: WorkflowErrorNotification = {
    workflowId: 'wf-123',
    workflowName: 'Test Workflow',
    executionId: 'exec-456',
    error: 'Something went wrong',
    notificationEmail: 'user@example.com',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    finishedAt: new Date('2024-01-01T10:00:05Z'),
  };

  describe('with RESEND_API_KEY configured', () => {
    beforeEach(async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'RESEND_API_KEY') return 'test-api-key';
                if (key === 'NOTIFICATION_FROM_EMAIL')
                  return 'MiniZapier <alerts@minizapier.com>';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('sendWorkflowErrorNotification', () => {
      it('should send email notification successfully', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'email-123' },
          error: null,
        });

        const result =
          await service.sendWorkflowErrorNotification(mockNotification);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 'MiniZapier <alerts@minizapier.com>',
            to: ['user@example.com'],
            subject: '[MiniZapier] Workflow Failed: Test Workflow',
          }),
        );
      });

      it('should include HTML and text body', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'email-123' },
          error: null,
        });

        await service.sendWorkflowErrorNotification(mockNotification);

        const callArgs = getLastEmailCall();
        expect(callArgs.html).toContain('Workflow Execution Failed');
        expect(callArgs.html).toContain('Test Workflow');
        expect(callArgs.html).toContain('exec-456');
        expect(callArgs.html).toContain('Something went wrong');
        expect(callArgs.text).toContain('Workflow: Test Workflow');
        expect(callArgs.text).toContain('Execution ID: exec-456');
      });

      it('should escape HTML in error message', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'email-123' },
          error: null,
        });

        const notificationWithHtml: WorkflowErrorNotification = {
          ...mockNotification,
          error: '<script>alert("xss")</script>',
        };

        await service.sendWorkflowErrorNotification(notificationWithHtml);

        const callArgs = getLastEmailCall();
        expect(callArgs.html).not.toContain('<script>');
        expect(callArgs.html).toContain('&lt;script&gt;');
      });

      it('should format duration in milliseconds for short durations', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'email-123' },
          error: null,
        });

        const quickNotification: WorkflowErrorNotification = {
          ...mockNotification,
          startedAt: new Date('2024-01-01T10:00:00.000Z'),
          finishedAt: new Date('2024-01-01T10:00:00.500Z'), // 500ms
        };

        await service.sendWorkflowErrorNotification(quickNotification);

        const callArgs = getLastEmailCall();
        expect(callArgs.html).toContain('500ms');
      });

      it('should format duration in seconds for longer durations', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'email-123' },
          error: null,
        });

        const slowNotification: WorkflowErrorNotification = {
          ...mockNotification,
          startedAt: new Date('2024-01-01T10:00:00.000Z'),
          finishedAt: new Date('2024-01-01T10:00:05.500Z'), // 5.5s
        };

        await service.sendWorkflowErrorNotification(slowNotification);

        const callArgs = getLastEmailCall();
        expect(callArgs.html).toContain('5.5s');
      });

      it('should return error when Resend fails', async () => {
        mockSend.mockResolvedValue({
          data: null,
          error: { message: 'Invalid API key' },
        });

        const result =
          await service.sendWorkflowErrorNotification(mockNotification);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid API key');
      });

      it('should handle network errors', async () => {
        mockSend.mockRejectedValue(new Error('Network error'));

        const result =
          await service.sendWorkflowErrorNotification(mockNotification);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });

      it('should handle non-Error exceptions', async () => {
        mockSend.mockRejectedValue('Unknown error');

        const result =
          await service.sendWorkflowErrorNotification(mockNotification);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });
    });
  });

  describe('without RESEND_API_KEY configured', () => {
    beforeEach(async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'RESEND_API_KEY') return undefined;
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<NotificationsService>(NotificationsService);
    });

    it('should return error when Resend is not configured', async () => {
      const result =
        await service.sendWorkflowErrorNotification(mockNotification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notifications not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('with default from email', () => {
    beforeEach(async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'RESEND_API_KEY') return 'test-api-key';
                if (key === 'NOTIFICATION_FROM_EMAIL') return undefined;
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<NotificationsService>(NotificationsService);
    });

    it('should use default from email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWorkflowErrorNotification(mockNotification);

      const callArgs = getLastEmailCall();
      expect(callArgs.from).toBe('MiniZapier <notifications@resend.dev>');
    });
  });
});
