import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { TriggersService } from './triggers.service';
import { WebhookTriggerService } from './services/webhook-trigger.service';
import { EmailTriggerService } from './services/email-trigger.service';
import { ExecutionsService } from '../executions/executions.service';

/**
 * Public webhook controller for receiving external triggers.
 * No authentication required - uses token-based security.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly triggersService: TriggersService,
    private readonly webhookTrigger: WebhookTriggerService,
    private readonly emailTrigger: EmailTriggerService,
    private readonly executionsService: ExecutionsService,
  ) {}

  @Post(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive webhook trigger',
    description:
      'Public endpoint for receiving webhook payloads. Triggers workflow execution.',
  })
  @ApiParam({ name: 'token', description: 'Webhook token' })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 403, description: 'Workflow is not active' })
  async receiveWebhook(
    @Param('token') token: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Received webhook: ${token}`);

    // Find trigger by token
    const result = await this.triggersService.findByWebhookToken(token);

    if (!result) {
      throw new NotFoundException('Webhook not found');
    }

    const { trigger, workflow } = result;

    // Check if workflow is active
    if (!workflow.isActive) {
      throw new ForbiddenException('Workflow is not active');
    }

    // Verify signature if secret is configured
    const config = trigger.config as { secret?: string };
    if (config.secret) {
      const signature =
        headers['x-webhook-signature'] || headers['x-hub-signature-256'];
      if (!signature) {
        this.logger.warn(`Missing signature for webhook ${token}`);
        throw new BadRequestException('Missing webhook signature');
      }

      // Get raw body for signature verification
      const rawBody = req.rawBody
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body);

      const isValid = this.webhookTrigger.verifySignature(
        rawBody,
        signature,
        config.secret,
      );

      if (!isValid) {
        this.logger.warn(`Invalid signature for webhook ${token}`);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Build trigger data
    const triggerData = this.webhookTrigger.buildTriggerData(
      body,
      headers,
      query,
      req.method,
    );

    // Create execution
    const execution = await this.executionsService.create(
      workflow.id,
      workflow.userId,
      triggerData,
    );

    this.logger.log(
      `Webhook ${token} triggered execution ${execution.id} for workflow ${workflow.id}`,
    );

    return {
      success: true,
      executionId: execution.id,
      message: 'Webhook received successfully',
    };
  }

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive email webhook (SendGrid/Mailgun inbound)',
    description:
      'Endpoint for receiving inbound email webhooks from email providers.',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'Optional token for additional security',
  })
  @ApiResponse({ status: 200, description: 'Email received and processed' })
  @ApiResponse({ status: 404, description: 'Email trigger not found' })
  @ApiResponse({ status: 403, description: 'Workflow is not active' })
  async receiveEmailWebhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Query('token') _securityToken?: string, // Reserved for future signature verification
  ) {
    this.logger.log('Received email webhook');

    // Detect email provider and parse accordingly
    let emailData;
    const contentType = headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      // Likely Mailgun JSON format
      emailData = this.emailTrigger.parseMailgunPayload(body);
    } else if (body.envelope || body.from) {
      // SendGrid format
      emailData = this.emailTrigger.parseSendGridPayload(body);
    } else {
      // Generic parsing
      emailData = this.emailTrigger.parseGenericPayload(body);
    }

    if (!emailData.to) {
      throw new BadRequestException('Missing recipient email address');
    }

    // Find trigger by email address
    const result = await this.triggersService.findByEmailAddress(emailData.to);

    if (!result) {
      this.logger.warn(`No trigger found for email address: ${emailData.to}`);
      // Return success anyway to prevent email provider retries
      return {
        success: false,
        message: 'No trigger found for this email address',
      };
    }

    const { trigger, workflow } = result;

    // Check if workflow is active
    if (!workflow.isActive) {
      return {
        success: false,
        message: 'Workflow is not active',
      };
    }

    // Build trigger data
    const triggerData = this.emailTrigger.buildEmailTriggerData(emailData);

    // Create execution
    const execution = await this.executionsService.create(
      workflow.id,
      workflow.userId,
      triggerData,
    );

    this.logger.log(
      `Email trigger ${trigger.id} created execution ${execution.id} for workflow ${workflow.id}`,
    );

    return {
      success: true,
      executionId: execution.id,
      message: 'Email received successfully',
    };
  }

  @Post('test/:token')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger - internal testing only
  async testWebhook(
    @Param('token') token: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Same as receiveWebhook but returns more debug info
    this.logger.log(`Test webhook received: ${token}`);

    const result = await this.triggersService.findByWebhookToken(token);

    if (!result) {
      return {
        success: false,
        error: 'Webhook not found',
        token,
      };
    }

    const { trigger, workflow } = result;

    return {
      success: true,
      trigger: {
        id: trigger.id,
        type: trigger.type,
      },
      workflow: {
        id: workflow.id,
        isActive: workflow.isActive,
      },
      received: {
        method: req.method,
        headers: Object.fromEntries(
          Object.entries(headers).filter(
            ([key]) => !key.toLowerCase().includes('authorization'),
          ),
        ),
        query,
        body,
      },
    };
  }
}
