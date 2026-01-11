import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CredentialsService } from './credentials.service';
import {
  CreateCredentialDto,
  UpdateCredentialDto,
  CredentialResponseDto,
} from './dto/credentials.dto';
import { CurrentUser } from '../auth';

@ApiTags('credentials')
@ApiBearerAuth()
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new credential' })
  @ApiResponse({
    status: 201,
    description: 'Credential created successfully',
    type: CredentialResponseDto,
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCredentialDto,
  ) {
    const credential = await this.credentialsService.create(userId, dto);
    return { data: credential, message: 'Credential created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all credentials for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of credentials',
    type: [CredentialResponseDto],
  })
  async findAll(@CurrentUser('id') userId: string) {
    const credentials = await this.credentialsService.findAll(userId);
    return { data: credentials };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a credential by ID' })
  @ApiResponse({
    status: 200,
    description: 'Credential details (without sensitive data)',
    type: CredentialResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const credential = await this.credentialsService.findOne(id, userId);
    return { data: credential };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a credential' })
  @ApiResponse({
    status: 200,
    description: 'Credential updated successfully',
    type: CredentialResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    const credential = await this.credentialsService.update(id, userId, dto);
    return { data: credential, message: 'Credential updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a credential' })
  @ApiResponse({ status: 200, description: 'Credential deleted successfully' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.credentialsService.remove(id, userId);
    return { message: 'Credential deleted successfully' };
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test a credential connection' })
  @ApiResponse({
    status: 200,
    description: 'Test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async test(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.credentialsService.testCredential(id, userId);
    return result;
  }
}
