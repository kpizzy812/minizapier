import { Injectable, Logger } from '@nestjs/common';
import {
  AIRequestConfig,
  AIRequestResult,
  SchemaField,
  OutputSchema,
} from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AIRequestAction {
  private readonly logger = new Logger(AIRequestAction.name);
  private readonly defaultTimeout = 60000; // 60 seconds for AI
  private readonly defaultBaseUrl = 'https://api.openai.com/v1';
  private readonly defaultModel = 'gpt-4o-mini';

  /**
   * Execute AI request (non-streaming)
   */
  async execute(config: AIRequestConfig): Promise<AIRequestResult> {
    const startTime = Date.now();

    try {
      const {
        prompt,
        systemPrompt,
        outputSchema,
        temperature = 0.7,
        maxTokens = 1000,
        apiKey,
        baseUrl = this.defaultBaseUrl,
        model = this.defaultModel,
      } = config;

      if (!apiKey) {
        return {
          success: false,
          error: 'AI API key not configured',
        };
      }

      if (!prompt || prompt.trim() === '') {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      // Build messages
      const messages: ChatMessage[] = [];

      if (systemPrompt && systemPrompt.trim() !== '') {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      // Build request body
      const requestBody: Record<string, unknown> = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      // Add structured output if schema provided
      if (outputSchema && outputSchema.fields.length > 0) {
        requestBody.response_format = {
          type: 'json_schema',
          json_schema: {
            name: outputSchema.name || 'response',
            description: outputSchema.description,
            schema: this.buildJsonSchema(outputSchema.fields),
            strict: true,
          },
        };
      }

      this.logger.debug(`AI request to ${baseUrl} with model ${model}`);

      // Make API request
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.defaultTimeout,
      );

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`AI API error: ${response.status} - ${errorText}`);

        // Parse error message from API response
        let errorMessage = `AI API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Use default error message
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: 'No content in AI response',
        };
      }

      // Parse JSON if structured output was requested
      let parsedContent: string | Record<string, unknown> = content;
      if (outputSchema && outputSchema.fields.length > 0) {
        try {
          parsedContent = this.parseAIJson(content);
        } catch (parseError) {
          this.logger.warn(`Failed to parse AI JSON response: ${parseError}`);
          // Return raw content if parsing fails
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          content: parsedContent,
          model: data.model || model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle specific errors
      if (errorMessage.includes('aborted')) {
        return {
          success: false,
          error: 'AI request timed out after 60 seconds',
          metadata: { duration },
        };
      }

      this.logger.error(`AI request failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration },
      };
    }
  }

  /**
   * Execute AI request with streaming (for test panel)
   * Returns async generator for SSE
   */
  async *executeStream(
    config: AIRequestConfig,
  ): AsyncGenerator<string, void, unknown> {
    const {
      prompt,
      systemPrompt,
      temperature = 0.7,
      maxTokens = 1000,
      apiKey,
      baseUrl = this.defaultBaseUrl,
      model = this.defaultModel,
    } = config;

    if (!apiKey) {
      throw new Error('AI API key not configured');
    }

    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt is required');
    }

    const messages: ChatMessage[] = [];
    if (systemPrompt && systemPrompt.trim() !== '') {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    this.logger.debug(`AI streaming request to ${baseUrl} with model ${model}`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `AI API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build JSON Schema from field definitions
   */
  private buildJsonSchema(fields: SchemaField[]): object {
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const field of fields) {
      properties[field.name] = this.fieldToJsonSchema(field);
      if (field.required !== false) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  /**
   * Convert single field to JSON Schema
   */
  private fieldToJsonSchema(field: SchemaField): object {
    const schema: Record<string, unknown> = {
      type: field.type,
    };

    if (field.description) {
      schema.description = field.description;
    }

    if (field.type === 'array' && field.items) {
      schema.items = this.fieldToJsonSchema(field.items);
    }

    if (field.type === 'object' && field.properties) {
      const nestedSchema = this.buildJsonSchema(field.properties);
      Object.assign(schema, nestedSchema);
    }

    return schema;
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseAIJson<T>(response: string): T {
    let cleaned = response.trim();

    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    return JSON.parse(cleaned.trim()) as T;
  }
}
