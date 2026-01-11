import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

// Node position DTO
class PositionDto {
  @ApiProperty({ example: 100 })
  x: number;

  @ApiProperty({ example: 200 })
  y: number;
}

// Node DTO
class WorkflowNodeDto {
  @ApiProperty({ example: 'node-1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'webhookTrigger' })
  @IsString()
  type: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @ApiProperty({ example: { label: 'Webhook', type: 'webhookTrigger' } })
  @IsObject()
  data: Record<string, unknown>;
}

// Edge DTO
class WorkflowEdgeDto {
  @ApiProperty({ example: 'edge-1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'node-1' })
  @IsString()
  source: string;

  @ApiProperty({ example: 'node-2' })
  @IsString()
  target: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  sourceHandle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetHandle?: string;
}

// Workflow definition DTO
class WorkflowDefinitionDto {
  @ApiProperty({ type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[];

  @ApiProperty({ type: [WorkflowEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[];

  @ApiPropertyOptional({ example: { apiKey: '{{vars.apiKey}}' } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'My First Workflow' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Send notification on webhook' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: WorkflowDefinitionDto })
  @ValidateNested()
  @Type(() => WorkflowDefinitionDto)
  definition: WorkflowDefinitionDto;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email for error notifications',
  })
  @IsOptional()
  @IsEmail()
  notificationEmail?: string;
}
