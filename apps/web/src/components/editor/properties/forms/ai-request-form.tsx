'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FieldWrapper,
  CredentialSelect,
  SchemaBuilder,
  type OutputSchema,
} from '../components';
import { TemplateInput } from '../../data-picker';
import { useAvailableData } from '@/hooks/use-available-data';
import { api } from '@/lib/api';
import {
  Sparkles,
  FileJson,
  MessageSquare,
  Settings,
  Play,
  Loader2,
  X,
  Tag,
  FileOutput,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import type { DataSource } from '../../data-picker';

interface AIRequestFormProps {
  nodeId: string;
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  dataSources?: DataSource[];
}

// Preset templates for common AI tasks
const presets = [
  {
    id: 'classify',
    name: 'Classify',
    icon: Tag,
    description: 'Categorize input into predefined categories',
    systemPrompt:
      'You are a classification assistant. Analyze the input and categorize it accurately.',
    prompt: 'Classify the following:\n\n{{trigger.body}}',
    schema: {
      name: 'classification',
      fields: [
        {
          name: 'category',
          type: 'string' as const,
          description: 'The category',
          required: true,
        },
        {
          name: 'confidence',
          type: 'number' as const,
          description: 'Confidence score 0-1',
          required: true,
        },
        {
          name: 'reasoning',
          type: 'string' as const,
          description: 'Brief explanation',
          required: false,
        },
      ],
    },
  },
  {
    id: 'extract',
    name: 'Extract',
    icon: FileOutput,
    description: 'Extract structured data from text',
    systemPrompt:
      'You are a data extraction assistant. Extract structured information from the input.',
    prompt: 'Extract information from:\n\n{{trigger.body}}',
    schema: {
      name: 'extracted_data',
      fields: [
        {
          name: 'entities',
          type: 'array' as const,
          description: 'Extracted entities',
          items: { name: 'entity', type: 'string' as const, required: true },
          required: true,
        },
      ],
    },
  },
  {
    id: 'generate',
    name: 'Generate',
    icon: Wand2,
    description: 'Generate text content',
    systemPrompt: 'You are a helpful assistant.',
    prompt: 'Generate content about:\n\n{{trigger.body.topic}}',
    schema: undefined,
  },
  {
    id: 'transform',
    name: 'Transform',
    icon: RefreshCw,
    description: 'Transform or reformat data',
    systemPrompt:
      'You are a data transformation assistant. Transform the input as requested.',
    prompt:
      'Transform the following data to the specified format:\n\n{{trigger.body}}',
    schema: undefined,
  },
];

export function AIRequestForm({
  nodeId,
  data,
  onUpdate,
  dataSources,
}: AIRequestFormProps) {
  const sources = useAvailableData();
  const [isTestStreaming, setIsTestStreaming] = useState(false);
  const [streamOutput, setStreamOutput] = useState('');
  const [testError, setTestError] = useState<string | null>(null);

  const label = (data.label as string) || 'AI Request';
  const credentialId = data.credentialId as string | undefined;
  const prompt = (data.prompt as string) || '';
  const systemPrompt = (data.systemPrompt as string) || '';
  const temperature = (data.temperature as number) ?? 0.7;
  const maxTokens = (data.maxTokens as number) ?? 1000;
  const outputSchema = data.outputSchema as OutputSchema | undefined;

  const activeTab = (data.aiMode as string) || 'prompt';

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        onUpdate({
          systemPrompt: preset.systemPrompt,
          prompt: preset.prompt,
          outputSchema: preset.schema,
        });
      }
    },
    [onUpdate]
  );

  const handleTestStream = useCallback(async () => {
    if (!credentialId || !prompt) return;

    setIsTestStreaming(true);
    setStreamOutput('');
    setTestError(null);

    try {
      await api.testAIStream(
        credentialId,
        prompt,
        systemPrompt,
        (chunk) => {
          setStreamOutput((prev) => prev + chunk);
        },
        (error) => {
          setTestError(error);
          setIsTestStreaming(false);
        },
        () => {
          setIsTestStreaming(false);
        }
      );
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Unknown error');
      setIsTestStreaming(false);
    }
  }, [credentialId, prompt, systemPrompt]);

  const clearTestOutput = () => {
    setStreamOutput('');
    setTestError(null);
  };

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="AI Assistant"
        />
      </FieldWrapper>

      {/* AI Credential */}
      <FieldWrapper
        label="AI Provider"
        hint="Select your AI API credentials (OpenAI, DeepSeek, etc.)"
        required
      >
        <CredentialSelect
          value={credentialId}
          onChange={(id) => onUpdate({ credentialId: id })}
          credentialType="AI"
          placeholder="Select AI credentials"
        />
      </FieldWrapper>

      {/* Presets */}
      <FieldWrapper label="Quick Start" hint="Apply a preset template">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            return (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.id)}
                className="gap-1.5"
                title={preset.description}
              >
                <Icon className="h-3.5 w-3.5" />
                {preset.name}
              </Button>
            );
          })}
        </div>
      </FieldWrapper>

      {/* Tabs: Prompt / Output Schema / Settings */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onUpdate({ aiMode: v })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompt" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="schema" className="gap-1.5 text-xs">
            <FileJson className="h-3.5 w-3.5" />
            Output
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Prompt Tab */}
        <TabsContent value="prompt" className="mt-4 space-y-4">
          <FieldWrapper
            label="System Prompt"
            hint="Instructions for the AI behavior (optional)"
          >
            <TemplateInput
              value={systemPrompt}
              onChange={(v) => onUpdate({ systemPrompt: v })}
              placeholder="You are a helpful assistant that..."
              sources={sources}
              multiline
              rows={3}
            />
          </FieldWrapper>

          <FieldWrapper
            label="Prompt"
            hint="The main prompt with data from previous steps"
            required
          >
            <TemplateInput
              value={prompt}
              onChange={(v) => onUpdate({ prompt: v })}
              placeholder="Analyze the following data: {{trigger.body}}"
              sources={sources}
              multiline
              rows={6}
            />
          </FieldWrapper>
        </TabsContent>

        {/* Output Schema Tab */}
        <TabsContent value="schema" className="mt-4">
          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground mb-3">
            Define a JSON schema to get structured output from the AI. Leave
            empty for free-form text response.
          </div>

          <SchemaBuilder
            schema={outputSchema}
            onChange={(schema) => onUpdate({ outputSchema: schema })}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <FieldWrapper
            label={`Temperature: ${temperature.toFixed(1)}`}
            hint="Lower = more focused, Higher = more creative (0-2)"
          >
            <Slider
              value={[temperature]}
              onValueChange={([v]) => onUpdate({ temperature: v })}
              min={0}
              max={2}
              step={0.1}
              className="py-2"
            />
          </FieldWrapper>

          <FieldWrapper
            label={`Max Tokens: ${maxTokens}`}
            hint="Maximum length of the response"
          >
            <Slider
              value={[maxTokens]}
              onValueChange={([v]) => onUpdate({ maxTokens: v })}
              min={100}
              max={4000}
              step={100}
              className="py-2"
            />
          </FieldWrapper>

          {/* Tips */}
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                Temperature 0-0.3: Factual, consistent responses
              </li>
              <li>
                Temperature 0.7-1.0: Creative, varied responses
              </li>
              <li>
                More tokens = longer responses (and higher cost)
              </li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Test Button and Output */}
      {credentialId && prompt && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleTestStream}
              disabled={isTestStreaming}
            >
              {isTestStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Test AI Request
            </Button>
            {(streamOutput || testError) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearTestOutput}
                title="Clear output"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {testError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {testError}
            </div>
          )}

          {streamOutput && (
            <div className="rounded-md bg-muted border p-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                AI Response
                {isTestStreaming && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </div>
              <ScrollArea className="max-h-[200px]">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {streamOutput}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Info when no credentials */}
      {!credentialId && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700">
          <p className="font-medium">AI Provider Required</p>
          <p className="mt-1">
            Select or create AI credentials above to use this action.
          </p>
        </div>
      )}
    </div>
  );
}
