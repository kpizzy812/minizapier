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

type AIProvider = 'openai' | 'deepseek' | 'other';

@Injectable()
export class AIRequestAction {
  private readonly logger = new Logger(AIRequestAction.name);
  private readonly defaultTimeout = 60000; // 60 seconds for AI
  private readonly defaultBaseUrl = 'https://api.openai.com/v1';
  private readonly defaultModel = 'gpt-4o-mini';

  /**
   * Determine AI provider from base URL
   */
  private detectProvider(baseUrl: string): AIProvider {
    const url = baseUrl.toLowerCase();
    if (url.includes('deepseek')) return 'deepseek';
    if (url.includes('openai.com')) return 'openai';
    // Default to OpenAI-compatible for other providers
    return 'other';
  }

  /**
   * Execute AI request (non-streaming)
   * Automatically selects best strategy based on provider
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

      const hasSchema = outputSchema && outputSchema.fields.length > 0;
      const provider = this.detectProvider(baseUrl);

      this.logger.debug(`AI provider detected: ${provider}, baseUrl: ${baseUrl}`);

      let result: {
        success: boolean;
        content?: string | Record<string, unknown>;
        model?: string;
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
        error?: string;
      };

      // Select strategy based on provider
      if (hasSchema) {
        if (provider === 'openai') {
          // OpenAI supports json_schema with strict mode
          result = await this.executeWithJsonSchema({
            prompt,
            systemPrompt,
            outputSchema: outputSchema!,
            temperature,
            maxTokens,
            apiKey,
            baseUrl,
            model,
          });
        } else {
          // DeepSeek and others: use json_object + example in prompt
          result = await this.executeWithJsonObjectMode({
            prompt,
            systemPrompt,
            outputSchema: outputSchema!,
            temperature,
            maxTokens,
            apiKey,
            baseUrl,
            model,
          });
        }
      } else {
        // No schema - simple text response
        result = await this.executeSimple({
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
          apiKey,
          baseUrl,
          model,
        });
      }

      const duration = Date.now() - startTime;

      if (!result.success || !result.content) {
        return {
          success: false,
          error: result.error || 'No content in AI response',
          metadata: { duration },
        };
      }

      return {
        success: true,
        data: {
          content: result.content,
          model: result.model || 'unknown',
          usage: result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

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
   * OpenAI strategy: use json_schema response_format with strict mode
   */
  private async executeWithJsonSchema(config: {
    prompt: string;
    systemPrompt?: string;
    outputSchema: OutputSchema;
    temperature: number;
    maxTokens: number;
    apiKey: string;
    baseUrl: string;
    model: string;
  }): Promise<{
    success: boolean;
    content?: string | Record<string, unknown>;
    model?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    error?: string;
  }> {
    const { prompt, systemPrompt, outputSchema, temperature, maxTokens, apiKey, baseUrl, model } = config;

    const messages: ChatMessage[] = [];
    if (systemPrompt && systemPrompt.trim() !== '') {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: outputSchema.name || 'response',
          description: outputSchema.description,
          schema: this.buildJsonSchema(outputSchema.fields),
          strict: true,
        },
      },
    };

    this.logger.debug(`OpenAI json_schema request to ${baseUrl}`);

    try {
      const result = await this.makeRequest(baseUrl, apiKey, requestBody);

      if (!result.success) {
        // If json_schema fails, fallback to json_object mode
        if (result.error?.includes('response_format') || result.error?.includes('json_schema')) {
          this.logger.warn('json_schema not supported, falling back to json_object mode');
          return this.executeWithJsonObjectMode(config);
        }
        return result;
      }

      // Parse JSON response
      if (result.content && typeof result.content === 'string') {
        try {
          result.content = this.parseAIJson(result.content);
        } catch (parseError) {
          this.logger.warn(`Failed to parse JSON: ${parseError}`);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * DeepSeek strategy: use json_object mode + detailed prompt with example
   * This is the recommended approach for DeepSeek API
   */
  private async executeWithJsonObjectMode(config: {
    prompt: string;
    systemPrompt?: string;
    outputSchema: OutputSchema;
    temperature: number;
    maxTokens: number;
    apiKey: string;
    baseUrl: string;
    model: string;
  }): Promise<{
    success: boolean;
    content?: string | Record<string, unknown>;
    model?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    error?: string;
  }> {
    const { prompt, systemPrompt, outputSchema, temperature, maxTokens, apiKey, baseUrl, model } = config;

    // Generate example JSON from schema
    const exampleJson = this.generateExampleFromSchema(outputSchema.fields);
    const schemaDescription = this.buildSchemaDescription(outputSchema.fields);

    // Build detailed system prompt with JSON example (required for DeepSeek)
    const jsonInstruction = `You must respond with a valid JSON object. Do not include any text outside the JSON.

REQUIRED JSON STRUCTURE:
${schemaDescription}

EXAMPLE OUTPUT:
${JSON.stringify(exampleJson, null, 2)}

IMPORTANT:
- Output ONLY the JSON object
- No markdown code blocks
- No explanations before or after
- Follow the exact field names and types shown above`;

    const messages: ChatMessage[] = [];

    if (systemPrompt && systemPrompt.trim() !== '') {
      messages.push({
        role: 'system',
        content: `${systemPrompt}\n\n${jsonInstruction}`,
      });
    } else {
      messages.push({ role: 'system', content: jsonInstruction });
    }

    messages.push({ role: 'user', content: prompt });

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature: Math.min(temperature, 0.5), // Lower temperature for consistent JSON
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    };

    this.logger.debug(`DeepSeek json_object request to ${baseUrl}`);

    try {
      const result = await this.makeRequest(baseUrl, apiKey, requestBody);

      if (!result.success) {
        // If json_object fails, try without response_format
        if (result.error?.includes('response_format') || result.error?.includes('json_object')) {
          this.logger.warn('json_object not supported, falling back to plain prompt');
          return this.executeWithPlainPrompt(config);
        }
        return result;
      }

      // Parse JSON response
      if (result.content && typeof result.content === 'string') {
        try {
          result.content = this.parseAIJson(result.content);
        } catch (parseError) {
          this.logger.warn(`Failed to parse JSON: ${parseError}`);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fallback: plain prompt without response_format
   */
  private async executeWithPlainPrompt(config: {
    prompt: string;
    systemPrompt?: string;
    outputSchema: OutputSchema;
    temperature: number;
    maxTokens: number;
    apiKey: string;
    baseUrl: string;
    model: string;
  }): Promise<{
    success: boolean;
    content?: string | Record<string, unknown>;
    model?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    error?: string;
  }> {
    const { prompt, systemPrompt, outputSchema, temperature, maxTokens, apiKey, baseUrl, model } = config;

    const exampleJson = this.generateExampleFromSchema(outputSchema.fields);
    const schemaDescription = this.buildSchemaDescription(outputSchema.fields);

    const jsonInstruction = `You must respond with a valid JSON object only.

REQUIRED JSON STRUCTURE:
${schemaDescription}

EXAMPLE OUTPUT:
${JSON.stringify(exampleJson, null, 2)}

Output ONLY the JSON object, no markdown, no explanation.`;

    const messages: ChatMessage[] = [];

    if (systemPrompt && systemPrompt.trim() !== '') {
      messages.push({
        role: 'system',
        content: `${systemPrompt}\n\n${jsonInstruction}`,
      });
    } else {
      messages.push({ role: 'system', content: jsonInstruction });
    }

    messages.push({ role: 'user', content: prompt });

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature: Math.min(temperature, 0.3),
      max_tokens: maxTokens,
    };

    this.logger.debug(`Plain prompt request to ${baseUrl}`);

    const result = await this.makeRequest(baseUrl, apiKey, requestBody);

    if (result.success && result.content && typeof result.content === 'string') {
      try {
        result.content = this.parseAIJson(result.content);
      } catch (parseError) {
        this.logger.warn(`Failed to parse plain prompt JSON: ${parseError}`);
      }
    }

    return result;
  }

  /**
   * Simple execution without schema (free-form text)
   */
  private async executeSimple(config: {
    prompt: string;
    systemPrompt?: string;
    temperature: number;
    maxTokens: number;
    apiKey: string;
    baseUrl: string;
    model: string;
  }): Promise<{
    success: boolean;
    content?: string | Record<string, unknown>;
    model?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    error?: string;
  }> {
    const { prompt, systemPrompt, temperature, maxTokens, apiKey, baseUrl, model } = config;

    const messages: ChatMessage[] = [];
    if (systemPrompt && systemPrompt.trim() !== '') {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    return this.makeRequest(baseUrl, apiKey, requestBody);
  }

  /**
   * Make HTTP request to AI API
   */
  private async makeRequest(
    baseUrl: string,
    apiKey: string,
    requestBody: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    content?: string;
    model?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    error?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
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

        let errorMessage = `AI API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Keep default error message
        }

        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return { success: false, error: 'No content in AI response' };
      }

      return {
        success: true,
        content,
        model: data.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate example JSON from schema fields
   * Creates realistic example values for each field type
   */
  private generateExampleFromSchema(fields: SchemaField[]): Record<string, unknown> {
    const example: Record<string, unknown> = {};

    for (const field of fields) {
      example[field.name] = this.generateExampleValue(field);
    }

    return example;
  }

  /**
   * Generate example value for a single field
   */
  private generateExampleValue(field: SchemaField): unknown {
    switch (field.type) {
      case 'string':
        // Use description as hint for realistic example
        if (field.description) {
          const desc = field.description.toLowerCase();
          if (desc.includes('email')) return 'user@example.com';
          if (desc.includes('name')) return 'John Doe';
          if (desc.includes('url')) return 'https://example.com';
          if (desc.includes('date')) return '2024-01-15';
          if (desc.includes('category')) return 'category_name';
          if (desc.includes('reason') || desc.includes('explanation')) return 'Brief explanation here';
        }
        return `example_${field.name}`;

      case 'number':
        if (field.description?.toLowerCase().includes('confidence')) return 0.95;
        if (field.description?.toLowerCase().includes('score')) return 85;
        if (field.description?.toLowerCase().includes('count')) return 5;
        return 42;

      case 'boolean':
        return true;

      case 'array':
        if (field.items) {
          return [this.generateExampleValue(field.items)];
        }
        return [];

      case 'object':
        if (field.properties) {
          return this.generateExampleFromSchema(field.properties);
        }
        return {};

      default:
        return null;
    }
  }

  /**
   * Build human-readable schema description
   */
  private buildSchemaDescription(fields: SchemaField[], indent = ''): string {
    const lines: string[] = [];

    for (const field of fields) {
      const required = field.required !== false ? ' (required)' : ' (optional)';
      const desc = field.description ? ` - ${field.description}` : '';
      lines.push(`${indent}- "${field.name}": ${field.type}${required}${desc}`);

      if (field.type === 'array' && field.items) {
        lines.push(`${indent}  items:`);
        lines.push(this.buildSchemaDescription([field.items], indent + '    '));
      }

      if (field.type === 'object' && field.properties) {
        lines.push(`${indent}  properties:`);
        lines.push(this.buildSchemaDescription(field.properties, indent + '    '));
      }
    }

    return lines.join('\n');
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

  /**
   * Execute AI request with streaming (for test panel)
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
        // Keep default error message
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
}
