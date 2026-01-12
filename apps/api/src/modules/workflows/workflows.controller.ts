import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecutionsService } from '../executions/executions.service';
import { ScheduleTriggerService } from '../triggers/services';
import { TriggersService } from '../triggers/triggers.service';
import { TriggerType } from '../triggers/dto/triggers.dto';
import { CurrentUser } from '../auth';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionsService: ExecutionsService,
    private readonly triggersService: TriggersService,
    private readonly scheduleTriggerService: ScheduleTriggerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateWorkflowDto,
  ) {
    const workflow = await this.workflowsService.create(userId, createDto);

    // Auto-sync trigger from definition
    if (createDto.definition) {
      await this.triggersService.syncTriggerFromDefinition(
        workflow.id,
        userId,
        createDto.definition as {
          nodes: Array<{
            id: string;
            type: string;
            data?: Record<string, unknown>;
          }>;
        },
      );
    }

    // Re-fetch workflow with trigger
    const updated = await this.workflowsService.findOne(workflow.id, userId);
    return { data: updated, message: 'Workflow created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows for current user' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const result = await this.workflowsService.findAll(userId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
    return { data: result.workflows, total: result.total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const workflow = await this.workflowsService.findOne(id, userId);
    return { data: workflow };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowDto,
  ) {
    const workflow = await this.workflowsService.update(id, userId, updateDto);

    // Auto-sync trigger from definition if definition changed
    if (updateDto.definition) {
      await this.triggersService.syncTriggerFromDefinition(
        id,
        userId,
        updateDto.definition as {
          nodes: Array<{
            id: string;
            type: string;
            data?: Record<string, unknown>;
          }>;
        },
      );
    }

    // Re-fetch workflow with trigger
    const updated = await this.workflowsService.findOne(id, userId);
    return { data: updated, message: 'Workflow updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.workflowsService.remove(id, userId);
    return { message: 'Workflow deleted successfully' };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a workflow' })
  @ApiResponse({ status: 201, description: 'Workflow duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async duplicate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const workflow = await this.workflowsService.duplicate(id, userId);
    return { data: workflow, message: 'Workflow duplicated successfully' };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a workflow (resumes schedule triggers)' })
  @ApiResponse({ status: 200, description: 'Workflow activated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async activate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    // Verify workflow exists
    await this.workflowsService.findOne(id, userId);

    // Get trigger for this workflow (returns null if not found, doesn't throw)
    const trigger = await this.triggersService.findByWorkflowIdSafe(id, userId);

    // Resume schedule trigger if exists
    if (trigger && trigger.type === TriggerType.SCHEDULE) {
      await this.scheduleTriggerService.resumeSchedule(trigger.id);
    }

    // Update workflow active state
    const updated = await this.workflowsService.setActive(id, userId, true);
    return { data: updated, message: 'Workflow activated' };
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workflow (pauses schedule triggers)' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    // Verify workflow exists
    await this.workflowsService.findOne(id, userId);

    // Get trigger for this workflow (returns null if not found, doesn't throw)
    const trigger = await this.triggersService.findByWorkflowIdSafe(id, userId);

    // Pause schedule trigger if exists
    if (trigger && trigger.type === TriggerType.SCHEDULE) {
      await this.scheduleTriggerService.pauseSchedule(trigger.id);
    }

    // Update workflow active state
    const updated = await this.workflowsService.setActive(id, userId, false);
    return { data: updated, message: 'Workflow deactivated' };
  }

  @Post(':id/test')
  @ApiOperation({
    summary: 'Run a test execution of the workflow',
    description:
      'Triggers a test run of the workflow with optional test data. Returns the created execution.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        testData: {
          type: 'object',
          description: 'Optional test data to use as trigger input',
        },
      },
    },
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Test execution started' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async test(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body?: { testData?: unknown },
  ) {
    // Verify workflow exists
    await this.workflowsService.findOne(id, userId);

    // Create test execution
    const execution = await this.executionsService.create(
      id,
      userId,
      body?.testData || { test: true, timestamp: new Date().toISOString() },
    );

    return {
      data: execution,
      message: 'Test execution started',
    };
  }
}
