import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AIRequestAction } from './services/ai-request.action';
import { CredentialsService } from '../credentials/credentials.service';
import { AICredentialData } from '../credentials/dto/credentials.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface TestAIRequestDto {
  credentialId: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiRequestAction: AIRequestAction,
    private readonly credentialsService: CredentialsService,
  ) {}

  /**
   * Test AI request with streaming response (SSE)
   */
  @Post('test/stream')
  @ApiOperation({ summary: 'Test AI request with streaming response' })
  async testStream(
    @Body() dto: TestAIRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      // Get credentials
      const credentialData = (await this.credentialsService.getCredentialData(
        dto.credentialId,
      )) as AICredentialData;

      const generator = this.aiRequestAction.executeStream({
        prompt: dto.prompt,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        apiKey: credentialData.apiKey,
        baseUrl: credentialData.baseUrl,
        model: credentialData.model,
      });

      for await (const chunk of generator) {
        const data = JSON.stringify({ type: 'chunk', content: chunk });
        res.write(`data: ${data}\n\n`);
      }

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI streaming test failed: ${errorMessage}`);

      const data = JSON.stringify({ type: 'error', error: errorMessage });
      res.write(`data: ${data}\n\n`);
      res.end();
    }
  }

  /**
   * Test AI request without streaming (for validation)
   */
  @Post('test')
  @ApiOperation({ summary: 'Test AI request without streaming' })
  async testRequest(@Body() dto: TestAIRequestDto) {
    try {
      const credentialData = (await this.credentialsService.getCredentialData(
        dto.credentialId,
      )) as AICredentialData;

      const result = await this.aiRequestAction.execute({
        prompt: dto.prompt,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        apiKey: credentialData.apiKey,
        baseUrl: credentialData.baseUrl,
        model: credentialData.model,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
