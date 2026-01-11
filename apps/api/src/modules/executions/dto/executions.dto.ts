import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExecutionStatusFilter {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
}

export class ListExecutionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by workflow ID' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({
    enum: ExecutionStatusFilter,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(ExecutionStatusFilter)
  status?: ExecutionStatusFilter;

  @ApiPropertyOptional({ description: 'Filter by start date (ISO)' })
  @IsOptional()
  @IsDateString()
  startedAfter?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO)' })
  @IsOptional()
  @IsDateString()
  startedBefore?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 20;
}

export class ExecutionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workflowId: string;

  @ApiProperty({ enum: ExecutionStatusFilter })
  status: string;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  finishedAt?: Date;

  @ApiPropertyOptional()
  input?: unknown;

  @ApiPropertyOptional()
  output?: unknown;

  @ApiPropertyOptional()
  error?: string;
}

export class StepLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  executionId: string;

  @ApiProperty()
  nodeId: string;

  @ApiProperty()
  nodeName: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  input?: unknown;

  @ApiPropertyOptional()
  output?: unknown;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  createdAt: Date;
}

export class ExecutionWithStepsResponseDto extends ExecutionResponseDto {
  @ApiProperty({ type: [StepLogResponseDto] })
  steps: StepLogResponseDto[];
}

export class PaginatedExecutionsResponseDto {
  @ApiProperty({ type: [ExecutionResponseDto] })
  executions: ExecutionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  skip: number;

  @ApiProperty()
  take: number;
}

export class ExecutionStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  success: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  running: number;

  @ApiProperty()
  pending: number;

  @ApiPropertyOptional()
  averageDuration?: number;
}
