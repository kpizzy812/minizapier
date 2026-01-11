import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TriggersService } from './triggers.service';
import {
  CreateTriggerDto,
  UpdateTriggerDto,
  TriggerResponseDto,
} from './dto/triggers.dto';

// Temporary: get userId from header until Supabase Auth is integrated
const getUserId = (headers: Record<string, string>): string => {
  return headers['x-user-id'] || 'temp-user-id';
};

@ApiTags('triggers')
@ApiBearerAuth()
@Controller('triggers')
export class TriggersController {
  constructor(private readonly triggersService: TriggersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trigger for a workflow' })
  @ApiResponse({
    status: 201,
    description: 'Trigger created successfully',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({
    status: 409,
    description: 'Workflow already has a trigger',
  })
  async create(
    @Headers() headers: Record<string, string>,
    @Body() dto: CreateTriggerDto,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.create(userId, dto);
    return { data: trigger, message: 'Trigger created successfully' };
  }

  @Get('workflow/:workflowId')
  @ApiOperation({ summary: 'Get trigger for a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Trigger details or null if no trigger',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findByWorkflow(
    @Headers() headers: Record<string, string>,
    @Param('workflowId') workflowId: string,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.findByWorkflowId(
      workflowId,
      userId,
    );
    return { data: trigger };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trigger by ID' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({
    status: 200,
    description: 'Trigger details',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async findOne(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.findOne(id, userId);
    return { data: trigger };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a trigger' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({
    status: 200,
    description: 'Trigger updated successfully',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async update(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() dto: UpdateTriggerDto,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.update(id, userId, dto);
    return { data: trigger, message: 'Trigger updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a trigger' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({ status: 200, description: 'Trigger deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async remove(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    await this.triggersService.remove(id, userId);
    return { message: 'Trigger deleted successfully' };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a trigger' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({
    status: 200,
    description: 'Trigger activated',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async activate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.activate(id, userId);
    return { data: trigger, message: 'Trigger activated' };
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a trigger' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({
    status: 200,
    description: 'Trigger deactivated',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async deactivate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.deactivate(id, userId);
    return { data: trigger, message: 'Trigger deactivated' };
  }

  @Post(':id/regenerate-url')
  @ApiOperation({
    summary: 'Regenerate webhook URL (for webhook triggers only)',
  })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook URL regenerated',
    type: TriggerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Not a webhook trigger' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  async regenerateWebhookUrl(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const trigger = await this.triggersService.regenerateWebhookUrl(id, userId);
    return { data: trigger, message: 'Webhook URL regenerated' };
  }
}
