import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import {
  ListExecutionsQueryDto,
  ExecutionResponseDto,
  ExecutionWithStepsResponseDto,
  PaginatedExecutionsResponseDto,
  StepLogResponseDto,
  ExecutionStatsDto,
} from './dto/executions.dto';
import { CurrentUser } from '../auth';

@ApiTags('Executions')
@ApiBearerAuth()
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all executions with filtering and pagination',
  })
  @ApiResponse({ status: 200, type: PaginatedExecutionsResponseDto })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListExecutionsQueryDto,
  ): Promise<PaginatedExecutionsResponseDto> {
    const { executions, total } = await this.executionsService.findAll(
      userId,
      query,
    );

    return {
      executions: executions as ExecutionResponseDto[],
      total,
      skip: query.skip || 0,
      take: query.take || 20,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get execution statistics' })
  @ApiResponse({ status: 200, type: ExecutionStatsDto })
  async getStats(
    @CurrentUser('id') userId: string,
    @Query('workflowId') workflowId?: string,
  ): Promise<ExecutionStatsDto> {
    return this.executionsService.getStats(userId, workflowId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution by ID with step logs' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiResponse({ status: 200, type: ExecutionWithStepsResponseDto })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ExecutionWithStepsResponseDto> {
    const execution = await this.executionsService.findOne(id, userId);
    return execution as unknown as ExecutionWithStepsResponseDto;
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get step logs for an execution' })
  @ApiParam({ name: 'id', description: 'Execution ID' })
  @ApiResponse({ status: 200, type: [StepLogResponseDto] })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getStepLogs(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<StepLogResponseDto[]> {
    const logs = await this.executionsService.getStepLogs(id, userId);
    return logs as StepLogResponseDto[];
  }

  @Post(':id/replay')
  @ApiOperation({ summary: 'Replay an execution from the beginning' })
  @ApiParam({ name: 'id', description: 'Execution ID to replay' })
  @ApiResponse({ status: 201, type: ExecutionResponseDto })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async replay(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ExecutionResponseDto> {
    const execution = await this.executionsService.replay(id, userId);
    return execution as ExecutionResponseDto;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending or running execution' })
  @ApiParam({ name: 'id', description: 'Execution ID to cancel' })
  @ApiResponse({ status: 200, type: ExecutionResponseDto })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this execution' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ExecutionResponseDto> {
    const execution = await this.executionsService.cancel(id, userId);
    return execution as ExecutionResponseDto;
  }
}
