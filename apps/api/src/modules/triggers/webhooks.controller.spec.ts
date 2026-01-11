/* eslint-disable @typescript-eslint/unbound-method */

// Mock Prisma client before importing services
jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: { InputJsonValue: {} },
  TriggerType: {
    WEBHOOK: 'WEBHOOK',
    SCHEDULE: 'SCHEDULE',
    EMAIL: 'EMAIL',
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksController } from './webhooks.controller';
import { TriggersService } from './triggers.service';
import { WebhookTriggerService } from './services/webhook-trigger.service';
import { EmailTriggerService } from './services/email-trigger.service';
import { ExecutionsService } from '../executions/executions.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let triggersService: jest.Mocked<TriggersService>;
  let webhookTriggerService: jest.Mocked<WebhookTriggerService>;
  let emailTriggerService: jest.Mocked<EmailTriggerService>;
  let executionsService: jest.Mocked<ExecutionsService>;

  const mockWorkflow = {
    id: 'wf-123',
    userId: 'user-123',
    name: 'Test Workflow',
    isActive: true,
  };

  const mockInactiveWorkflow = {
    ...mockWorkflow,
    isActive: false,
  };

  const mockTrigger = {
    id: 'trigger-123',
    type: 'WEBHOOK',
    config: {},
    workflowId: 'wf-123',
  };

  const mockTriggerWithSecret = {
    ...mockTrigger,
    config: { secret: 'my-secret-key' },
  };

  const mockExecution = {
    id: 'exec-123',
    workflowId: 'wf-123',
    status: 'PENDING',
    startedAt: new Date(),
  };

  const createMockRequest = (
    method: string = 'POST',
    rawBody?: Buffer,
  ): RawBodyRequest<Request> => {
    return {
      method,
      rawBody,
    } as RawBodyRequest<Request>;
  };

  beforeEach(async () => {
    const mockTriggersService = {
      findByWebhookToken: jest.fn(),
      findByEmailAddress: jest.fn(),
    };

    const mockWebhookTriggerService = {
      verifySignature: jest.fn(),
      buildTriggerData: jest.fn(),
    };

    const mockEmailTriggerService = {
      parseSendGridPayload: jest.fn(),
      parseMailgunPayload: jest.fn(),
      parseGenericPayload: jest.fn(),
      buildEmailTriggerData: jest.fn(),
    };

    const mockExecutionsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: TriggersService, useValue: mockTriggersService },
        { provide: WebhookTriggerService, useValue: mockWebhookTriggerService },
        { provide: EmailTriggerService, useValue: mockEmailTriggerService },
        { provide: ExecutionsService, useValue: mockExecutionsService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    triggersService = module.get(TriggersService);
    webhookTriggerService = module.get(WebhookTriggerService);
    emailTriggerService = module.get(EmailTriggerService);
    executionsService = module.get(ExecutionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('receiveWebhook', () => {
    const body = { event: 'test', data: { foo: 'bar' } };
    const headers = { 'content-type': 'application/json' };
    const query = {};

    it('should receive webhook and create execution', async () => {
      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTrigger,
        workflow: mockWorkflow,
      });
      webhookTriggerService.buildTriggerData.mockReturnValue({
        body,
        headers,
        query,
        method: 'POST',
      });
      executionsService.create.mockResolvedValue(mockExecution);

      const result = await controller.receiveWebhook(
        'abc123',
        body,
        headers,
        query,
        createMockRequest('POST'),
      );

      expect(result).toEqual({
        success: true,
        executionId: 'exec-123',
        message: 'Webhook received successfully',
      });
      expect(triggersService.findByWebhookToken).toHaveBeenCalledWith('abc123');
      expect(executionsService.create).toHaveBeenCalledWith(
        'wf-123',
        'user-123',
        { body, headers, query, method: 'POST' },
      );
    });

    it('should throw NotFoundException when webhook not found', async () => {
      triggersService.findByWebhookToken.mockResolvedValue(null);

      await expect(
        controller.receiveWebhook(
          'invalid-token',
          body,
          headers,
          query,
          createMockRequest(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when workflow is inactive', async () => {
      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTrigger,
        workflow: mockInactiveWorkflow,
      });

      await expect(
        controller.receiveWebhook(
          'abc123',
          body,
          headers,
          query,
          createMockRequest(),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify signature when secret is configured', async () => {
      const rawBody = Buffer.from(JSON.stringify(body));
      const signature = 'sha256=validhash';

      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTriggerWithSecret,
        workflow: mockWorkflow,
      });
      webhookTriggerService.verifySignature.mockReturnValue(true);
      webhookTriggerService.buildTriggerData.mockReturnValue({
        body,
        headers: { ...headers, 'x-webhook-signature': signature },
        query,
        method: 'POST',
      });
      executionsService.create.mockResolvedValue(mockExecution);

      const result = await controller.receiveWebhook(
        'abc123',
        body,
        { ...headers, 'x-webhook-signature': signature },
        query,
        createMockRequest('POST', rawBody),
      );

      expect(result.success).toBe(true);
      expect(webhookTriggerService.verifySignature).toHaveBeenCalledWith(
        JSON.stringify(body),
        signature,
        'my-secret-key',
      );
    });

    it('should throw BadRequestException when signature is missing', async () => {
      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTriggerWithSecret,
        workflow: mockWorkflow,
      });

      await expect(
        controller.receiveWebhook(
          'abc123',
          body,
          headers,
          query,
          createMockRequest(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when signature is invalid', async () => {
      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTriggerWithSecret,
        workflow: mockWorkflow,
      });
      webhookTriggerService.verifySignature.mockReturnValue(false);

      await expect(
        controller.receiveWebhook(
          'abc123',
          body,
          { ...headers, 'x-webhook-signature': 'invalid' },
          query,
          createMockRequest(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use x-hub-signature-256 header if x-webhook-signature not present', async () => {
      const rawBody = Buffer.from(JSON.stringify(body));
      const signature = 'sha256=githubhash';

      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTriggerWithSecret,
        workflow: mockWorkflow,
      });
      webhookTriggerService.verifySignature.mockReturnValue(true);
      webhookTriggerService.buildTriggerData.mockReturnValue({
        body,
        headers: { ...headers, 'x-hub-signature-256': signature },
        query,
        method: 'POST',
      });
      executionsService.create.mockResolvedValue(mockExecution);

      const result = await controller.receiveWebhook(
        'abc123',
        body,
        { ...headers, 'x-hub-signature-256': signature },
        query,
        createMockRequest('POST', rawBody),
      );

      expect(result.success).toBe(true);
      expect(webhookTriggerService.verifySignature).toHaveBeenCalledWith(
        JSON.stringify(body),
        signature,
        'my-secret-key',
      );
    });
  });

  describe('receiveEmailWebhook', () => {
    const mockEmailData = {
      from: 'sender@example.com',
      to: 'trigger-abc@inbound.example.com',
      subject: 'Test Email',
      text: 'Hello',
      html: '<p>Hello</p>',
    };

    const mockEmailTriggerData: {
      email: typeof mockEmailData;
      receivedAt: string;
    } = {
      email: mockEmailData,
      receivedAt: new Date().toISOString(),
    };

    it('should receive email webhook with SendGrid format', async () => {
      const sendGridPayload = {
        from: 'sender@example.com',
        envelope: JSON.stringify({ to: ['trigger-abc@inbound.example.com'] }),
      };

      emailTriggerService.parseSendGridPayload.mockReturnValue(mockEmailData);
      triggersService.findByEmailAddress.mockResolvedValue({
        trigger: { ...mockTrigger, type: 'EMAIL' },
        workflow: mockWorkflow,
      });
      emailTriggerService.buildEmailTriggerData.mockReturnValue(
        mockEmailTriggerData,
      );
      executionsService.create.mockResolvedValue(mockExecution);

      const result = await controller.receiveEmailWebhook(sendGridPayload, {
        'content-type': 'multipart/form-data',
      });

      expect(result).toEqual({
        success: true,
        executionId: 'exec-123',
        message: 'Email received successfully',
      });
    });

    it('should receive email webhook with Mailgun JSON format', async () => {
      const mailgunPayload = {
        sender: 'sender@example.com',
        recipient: 'trigger-abc@inbound.example.com',
      };

      emailTriggerService.parseMailgunPayload.mockReturnValue(mockEmailData);
      triggersService.findByEmailAddress.mockResolvedValue({
        trigger: { ...mockTrigger, type: 'EMAIL' },
        workflow: mockWorkflow,
      });
      emailTriggerService.buildEmailTriggerData.mockReturnValue(
        mockEmailTriggerData,
      );
      executionsService.create.mockResolvedValue(mockExecution);

      const result = await controller.receiveEmailWebhook(mailgunPayload, {
        'content-type': 'application/json',
      });

      expect(result).toEqual({
        success: true,
        executionId: 'exec-123',
        message: 'Email received successfully',
      });
    });

    it('should return success false when no trigger found', async () => {
      emailTriggerService.parseGenericPayload.mockReturnValue(mockEmailData);
      triggersService.findByEmailAddress.mockResolvedValue(null);

      const result = await controller.receiveEmailWebhook(
        { to: 'unknown@example.com' },
        {},
      );

      expect(result).toEqual({
        success: false,
        message: 'No trigger found for this email address',
      });
    });

    it('should return success false when workflow is inactive', async () => {
      // body.from is present, so parseSendGridPayload is called
      emailTriggerService.parseSendGridPayload.mockReturnValue(mockEmailData);
      triggersService.findByEmailAddress.mockResolvedValue({
        trigger: { ...mockTrigger, type: 'EMAIL' },
        workflow: mockInactiveWorkflow,
      });

      const result = await controller.receiveEmailWebhook(mockEmailData, {});

      expect(result).toEqual({
        success: false,
        message: 'Workflow is not active',
      });
    });

    it('should throw BadRequestException when recipient email is missing', async () => {
      // body.from is present, so parseSendGridPayload is called
      emailTriggerService.parseSendGridPayload.mockReturnValue({
        from: 'sender@example.com',
        to: undefined,
      });

      await expect(
        controller.receiveEmailWebhook({ from: 'sender@example.com' }, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('testWebhook', () => {
    const body = { test: true };
    const headers = { 'content-type': 'application/json' };
    const query = { debug: 'true' };

    it('should return debug info for valid webhook', async () => {
      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTrigger,
        workflow: mockWorkflow,
      });

      const result = await controller.testWebhook(
        'abc123',
        body,
        headers,
        query,
        createMockRequest('POST'),
      );

      expect(result).toEqual({
        success: true,
        trigger: {
          id: 'trigger-123',
          type: 'WEBHOOK',
        },
        workflow: {
          id: 'wf-123',
          isActive: true,
        },
        received: {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          query: { debug: 'true' },
          body: { test: true },
        },
      });
    });

    it('should return error when webhook not found', async () => {
      triggersService.findByWebhookToken.mockResolvedValue(null);

      const result = await controller.testWebhook(
        'invalid',
        body,
        headers,
        query,
        createMockRequest(),
      );

      expect(result).toEqual({
        success: false,
        error: 'Webhook not found',
        token: 'invalid',
      });
    });

    it('should filter out authorization headers', async () => {
      triggersService.findByWebhookToken.mockResolvedValue({
        trigger: mockTrigger,
        workflow: mockWorkflow,
      });

      const result = await controller.testWebhook(
        'abc123',
        body,
        { ...headers, authorization: 'Bearer secret-token' },
        query,
        createMockRequest('POST'),
      );

      expect(result.received.headers).not.toHaveProperty('authorization');
      expect(result.received.headers).toHaveProperty('content-type');
    });
  });
});
