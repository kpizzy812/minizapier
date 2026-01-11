import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

// Temporary: get userId from header until Supabase Auth is integrated
const getUserId = (headers: Record<string, string>): string => {
  return headers['x-user-id'] || 'temp-user-id';
};

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(
    @Headers() headers: Record<string, string>,
    @Body() createDto: CreateWorkflowDto,
  ) {
    const userId = getUserId(headers);
    const workflow = await this.workflowsService.create(userId, createDto);
    return { data: workflow, message: 'Workflow created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows for current user' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async findAll(
    @Headers() headers: Record<string, string>,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const userId = getUserId(headers);
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
  async findOne(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const workflow = await this.workflowsService.findOne(id, userId);
    return { data: workflow };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async update(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowDto,
  ) {
    const userId = getUserId(headers);
    const workflow = await this.workflowsService.update(id, userId, updateDto);
    return { data: workflow, message: 'Workflow updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async remove(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    await this.workflowsService.remove(id, userId);
    return { message: 'Workflow deleted successfully' };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a workflow' })
  @ApiResponse({ status: 201, description: 'Workflow duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async duplicate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const workflow = await this.workflowsService.duplicate(id, userId);
    return { data: workflow, message: 'Workflow duplicated successfully' };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async activate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const workflow = await this.workflowsService.setActive(id, userId, true);
    return { data: workflow, message: 'Workflow activated' };
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deactivate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const userId = getUserId(headers);
    const workflow = await this.workflowsService.setActive(id, userId, false);
    return { data: workflow, message: 'Workflow deactivated' };
  }
}
