'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Code, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface SchemaField {
  name: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  items?: SchemaField;
  properties?: SchemaField[];
}

export interface OutputSchema {
  name: string;
  description?: string;
  fields: SchemaField[];
}

interface SchemaBuilderProps {
  schema?: OutputSchema;
  onChange: (schema: OutputSchema | undefined) => void;
}

const fieldTypes: { value: FieldType; label: string; color: string }[] = [
  { value: 'string', label: 'String', color: 'bg-green-500/20 text-green-700' },
  { value: 'number', label: 'Number', color: 'bg-blue-500/20 text-blue-700' },
  {
    value: 'boolean',
    label: 'Boolean',
    color: 'bg-amber-500/20 text-amber-700',
  },
  { value: 'array', label: 'Array', color: 'bg-purple-500/20 text-purple-700' },
  { value: 'object', label: 'Object', color: 'bg-pink-500/20 text-pink-700' },
];

function FieldEditor({
  field,
  onChange,
  onRemove,
  depth = 0,
}: {
  field: SchemaField;
  onChange: (field: SchemaField) => void;
  onRemove: () => void;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const typeConfig = fieldTypes.find((t) => t.value === field.type);
  const hasChildren =
    (field.type === 'array' && field.items) ||
    (field.type === 'object' && field.properties?.length);

  return (
    <div
      className={cn(
        'border rounded-lg p-3 space-y-3',
        depth > 0 && 'ml-4 border-dashed'
      )}
    >
      {/* Row 1: Name input */}
      <div className="flex items-center gap-2">
        {/* Expand/collapse for complex types */}
        {(field.type === 'array' || field.type === 'object') && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}

        <Input
          value={field.name}
          onChange={(e) => onChange({ ...field, name: e.target.value })}
          placeholder="field_name"
          className="flex-1 h-8 text-sm font-mono"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 2: Type, Required */}
      <div className="flex items-center gap-2">
        <Select
          value={field.type}
          onValueChange={(v) => {
            const newField = { ...field, type: v as FieldType };
            // Reset nested properties when type changes
            if (v !== 'array') delete newField.items;
            if (v !== 'object') delete newField.properties;
            onChange(newField);
          }}
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue>
              <Badge className={cn('text-xs', typeConfig?.color)}>
                {field.type}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {fieldTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <Badge className={cn('text-xs', t.color)}>{t.label}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Switch
            checked={field.required !== false}
            onCheckedChange={(v) => onChange({ ...field, required: v })}
            className="scale-75"
          />
          <span className="text-xs text-muted-foreground">Required</span>
        </div>
      </div>

      {/* Row 3: Description */}
      <Input
        value={field.description || ''}
        onChange={(e) => onChange({ ...field, description: e.target.value })}
        placeholder="Description (helps AI understand what to output)"
        className="h-7 text-xs"
      />

      {/* Array items */}
      {field.type === 'array' && isExpanded && (
        <div className="border-t pt-3">
          <div className="text-xs font-medium mb-2 text-muted-foreground">
            Array Items
          </div>
          {field.items ? (
            <FieldEditor
              field={field.items}
              onChange={(items) => onChange({ ...field, items })}
              onRemove={() => onChange({ ...field, items: undefined })}
              depth={depth + 1}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...field,
                  items: { name: 'item', type: 'string', required: true },
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" />
              Define Item Type
            </Button>
          )}
        </div>
      )}

      {/* Object properties */}
      {field.type === 'object' && isExpanded && (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-muted-foreground">
              Object Properties
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...field,
                  properties: [
                    ...(field.properties || []),
                    { name: 'property', type: 'string', required: true },
                  ],
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {field.properties?.map((prop, i) => (
              <FieldEditor
                key={i}
                field={prop}
                onChange={(updated) =>
                  onChange({
                    ...field,
                    properties: field.properties?.map((p, j) =>
                      j === i ? updated : p
                    ),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...field,
                    properties: field.properties?.filter((_, j) => j !== i),
                  })
                }
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SchemaBuilder({ schema, onChange }: SchemaBuilderProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleAddField = () => {
    const newSchema: OutputSchema = schema || {
      name: 'response',
      fields: [],
    };
    onChange({
      ...newSchema,
      fields: [
        ...newSchema.fields,
        { name: 'field', type: 'string', required: true },
      ],
    });
  };

  const handleFieldChange = (index: number, field: SchemaField) => {
    if (!schema) return;
    onChange({
      ...schema,
      fields: schema.fields.map((f, i) => (i === index ? field : f)),
    });
  };

  const handleFieldRemove = (index: number) => {
    if (!schema) return;
    const newFields = schema.fields.filter((_, i) => i !== index);
    if (newFields.length === 0) {
      onChange(undefined);
    } else {
      onChange({ ...schema, fields: newFields });
    }
  };

  // Build JSON Schema for preview
  const buildJsonSchema = (): object | null => {
    if (!schema || schema.fields.length === 0) return null;

    const buildField = (field: SchemaField): object => {
      const base: Record<string, unknown> = { type: field.type };
      if (field.description) base.description = field.description;

      if (field.type === 'array' && field.items) {
        base.items = buildField(field.items);
      }

      if (field.type === 'object' && field.properties) {
        const props: Record<string, object> = {};
        const req: string[] = [];
        for (const p of field.properties) {
          props[p.name] = buildField(p);
          if (p.required !== false) req.push(p.name);
        }
        base.properties = props;
        base.required = req;
      }

      return base;
    };

    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const field of schema.fields) {
      properties[field.name] = buildField(field);
      if (field.required !== false) required.push(field.name);
    }

    return {
      name: schema.name,
      schema: {
        type: 'object',
        properties,
        required,
      },
    };
  };

  return (
    <div className="space-y-4">
      {/* Schema Name */}
      {schema && (
        <div className="flex gap-2">
          <Input
            value={schema.name}
            onChange={(e) => onChange({ ...schema, name: e.target.value })}
            placeholder="response"
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowPreview(!showPreview)}
            title="Preview JSON Schema"
            className={cn(showPreview && 'bg-muted')}
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-2">
        {schema?.fields.map((field, index) => (
          <FieldEditor
            key={index}
            field={field}
            onChange={(f) => handleFieldChange(index, f)}
            onRemove={() => handleFieldRemove(index)}
          />
        ))}
      </div>

      {/* Add Field Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleAddField}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Output Field
      </Button>

      {/* JSON Schema Preview */}
      {showPreview && schema && (
        <div className="border rounded-lg p-3 bg-muted/30 max-h-64 overflow-y-auto">
          <div className="text-xs font-medium mb-2 sticky top-0 bg-muted/30">JSON Schema Preview</div>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
            {JSON.stringify(buildJsonSchema(), null, 2)}
          </pre>
        </div>
      )}

      {/* Hint when empty */}
      {!schema && (
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Add output fields to get structured JSON from AI. Leave empty for
          free-form text response.
        </div>
      )}
    </div>
  );
}
