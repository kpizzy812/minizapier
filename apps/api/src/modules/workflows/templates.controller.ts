import { Controller, Get, Post, Param, Body, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { TriggersService } from '../triggers/triggers.service';
import { TriggerType } from '../triggers/dto/triggers.dto';
import { CurrentUser } from '../auth';
import { templates, getTemplateById, WorkflowTemplate } from '../../templates';

interface CreateFromTemplateDto {
  templateId: string;
  placeholders: Record<string, string>;
  credentialIds: {
    telegram?: string;
    resend?: string;
    database?: string;
  };
}

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly triggersService: TriggersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all available workflow templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates() {
    return {
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        requiredCredentials: t.requiredCredentials,
        placeholders: t.placeholders,
        testInstructions: t.testInstructions,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('id') id: string) {
    const template = getTemplateById(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return { data: template };
  }

  @Post(':id/create')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, description: 'Workflow created from template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createFromTemplate(
    @CurrentUser('id') userId: string,
    @Param('id') templateId: string,
    @Body() dto: CreateFromTemplateDto,
  ) {
    const template = getTemplateById(templateId);
    if (!template) {
      return { error: 'Template not found' };
    }

    // Replace placeholders in definition
    let definitionStr = JSON.stringify(template.definition);

    // Replace user-provided placeholders
    for (const [key, value] of Object.entries(dto.placeholders)) {
      definitionStr = definitionStr.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value,
      );
    }

    // Replace credential IDs
    if (dto.credentialIds.telegram) {
      definitionStr = definitionStr.replace(
        /\{\{CREDENTIAL_TELEGRAM\}\}/g,
        dto.credentialIds.telegram,
      );
    }
    if (dto.credentialIds.resend) {
      definitionStr = definitionStr.replace(
        /\{\{CREDENTIAL_RESEND\}\}/g,
        dto.credentialIds.resend,
      );
    }
    if (dto.credentialIds.database) {
      definitionStr = definitionStr.replace(
        /\{\{CREDENTIAL_DATABASE\}\}/g,
        dto.credentialIds.database,
      );
    }

    const definition = JSON.parse(definitionStr);

    // Create workflow
    const workflow = await this.workflowsService.create(userId, {
      name: `${template.name} (from template)`,
      description: template.description,
      definition,
    });

    // Create trigger if template has trigger config
    if (template.triggerConfig) {
      let triggerConfigStr = JSON.stringify(template.triggerConfig.config);

      // Replace placeholders in trigger config
      for (const [key, value] of Object.entries(dto.placeholders)) {
        triggerConfigStr = triggerConfigStr.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          value,
        );
      }

      await this.triggersService.create(userId, {
        workflowId: workflow.id,
        type: template.triggerConfig.type as TriggerType,
        config: JSON.parse(triggerConfigStr),
      });
    }

    this.logger.log(
      `Created workflow ${workflow.id} from template ${templateId} for user ${userId}`,
    );

    return {
      data: workflow,
      message: `Workflow created from template "${template.name}"`,
    };
  }
}
