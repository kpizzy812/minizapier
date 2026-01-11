import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Trigger types matching Prisma enum
 */
export enum TriggerType {
  WEBHOOK = 'WEBHOOK',
  SCHEDULE = 'SCHEDULE',
  EMAIL = 'EMAIL',
}

/**
 * Webhook trigger configuration
 */
export class WebhookConfigDto {
  @ApiPropertyOptional({
    description: 'Secret for webhook signature verification (HMAC-SHA256)',
    example: 'my-secret-key',
  })
  @IsString()
  @IsOptional()
  secret?: string;
}

/**
 * Schedule trigger configuration (cron)
 */
export class ScheduleConfigDto {
  @ApiProperty({
    description:
      'Cron expression (6 fields: second minute hour day month weekday)',
    example: '0 0 9 * * 1-5',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)$/,
    {
      message:
        'Invalid cron expression. Use 6 fields: second minute hour day month weekday',
    },
  )
  cron!: string;

  @ApiPropertyOptional({
    description: 'Timezone for cron execution',
    example: 'Europe/Moscow',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

/**
 * Email trigger configuration
 */
export class EmailConfigDto {
  @ApiPropertyOptional({
    description:
      'Email address for inbound emails (auto-generated if not provided)',
    example: 'trigger-abc123@inbound.example.com',
  })
  @IsString()
  @IsOptional()
  address?: string;
}

/**
 * Union type for trigger configs
 */
export type TriggerConfigDto =
  | WebhookConfigDto
  | ScheduleConfigDto
  | EmailConfigDto;

/**
 * DTO for creating a webhook trigger
 */
export class CreateWebhookTriggerDto {
  @ApiProperty({ enum: [TriggerType.WEBHOOK] })
  @IsEnum(TriggerType)
  type!: TriggerType.WEBHOOK;

  @ApiProperty({ type: WebhookConfigDto })
  @ValidateNested()
  @Type(() => WebhookConfigDto)
  @IsObject()
  config!: WebhookConfigDto;
}

/**
 * DTO for creating a schedule trigger
 */
export class CreateScheduleTriggerDto {
  @ApiProperty({ enum: [TriggerType.SCHEDULE] })
  @IsEnum(TriggerType)
  type!: TriggerType.SCHEDULE;

  @ApiProperty({ type: ScheduleConfigDto })
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  @IsObject()
  config!: ScheduleConfigDto;
}

/**
 * DTO for creating an email trigger
 */
export class CreateEmailTriggerDto {
  @ApiProperty({ enum: [TriggerType.EMAIL] })
  @IsEnum(TriggerType)
  type!: TriggerType.EMAIL;

  @ApiProperty({ type: EmailConfigDto })
  @ValidateNested()
  @Type(() => EmailConfigDto)
  @IsObject()
  config!: EmailConfigDto;
}

/**
 * DTO for creating any trigger
 */
export class CreateTriggerDto {
  @ApiProperty({
    description: 'Workflow ID to attach the trigger to',
  })
  @IsString()
  @IsNotEmpty()
  workflowId!: string;

  @ApiProperty({
    enum: TriggerType,
    description: 'Type of trigger',
  })
  @IsEnum(TriggerType)
  type!: TriggerType;

  @ApiProperty({
    description: 'Trigger configuration based on type',
    oneOf: [
      { $ref: '#/components/schemas/WebhookConfigDto' },
      { $ref: '#/components/schemas/ScheduleConfigDto' },
      { $ref: '#/components/schemas/EmailConfigDto' },
    ],
  })
  @IsObject()
  config!: TriggerConfigDto;
}

/**
 * DTO for updating a trigger
 */
export class UpdateTriggerDto {
  @ApiPropertyOptional({
    description: 'Updated trigger configuration',
  })
  @IsObject()
  @IsOptional()
  config?: TriggerConfigDto;

  @ApiPropertyOptional({
    description: 'Whether the trigger is active',
  })
  @IsOptional()
  isActive?: boolean;
}

/**
 * Response DTO for trigger
 */
export class TriggerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TriggerType })
  type!: TriggerType;

  @ApiProperty()
  config!: TriggerConfigDto;

  @ApiPropertyOptional({
    description: 'Webhook URL (only for webhook triggers)',
  })
  webhookUrl?: string;

  @ApiProperty()
  workflowId!: string;

  @ApiPropertyOptional({
    description: 'Whether the trigger is active (for schedule triggers)',
  })
  isActive?: boolean;
}

/**
 * DTO for webhook payload
 */
export class WebhookPayloadDto {
  @ApiPropertyOptional({
    description: 'Request headers',
  })
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Request body',
  })
  body?: unknown;

  @ApiPropertyOptional({
    description: 'Query parameters',
  })
  query?: Record<string, string>;
}

/**
 * DTO for email webhook payload (from SendGrid/Mailgun)
 */
export class EmailWebhookPayloadDto {
  @ApiProperty({ description: 'Sender email address' })
  @IsString()
  from!: string;

  @ApiProperty({ description: 'Recipient email address' })
  @IsString()
  to!: string;

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ description: 'Plain text body' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML body' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({ description: 'Attachments info' })
  @IsOptional()
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}
