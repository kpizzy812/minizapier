'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldWrapper } from '../components';
import { Badge } from '@/components/ui/badge';

interface HttpRequestFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

const httpMethods = [
  { value: 'GET', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  { value: 'POST', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  { value: 'PUT', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  { value: 'PATCH', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400' },
  { value: 'DELETE', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
];

export function HttpRequestForm({ data, onUpdate }: HttpRequestFormProps) {
  const label = (data.label as string) || 'HTTP Request';
  const method = (data.method as string) || 'GET';
  const url = (data.url as string) || '';
  const headers = (data.headers as Record<string, string>) || {};
  const body = (data.body as string) || '';

  // Convert headers object to string for textarea
  const headersString = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  // Parse headers string back to object
  const parseHeaders = (str: string): Record<string, string> => {
    const result: Record<string, string> = {};
    str.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key) result[key] = value;
      }
    });
    return result;
  };

  const selectedMethod = httpMethods.find((m) => m.value === method);

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="My HTTP Request"
        />
      </FieldWrapper>

      {/* Method selection */}
      <FieldWrapper label="Method" hint="HTTP method to use" required>
        <Select value={method} onValueChange={(v) => onUpdate({ method: v })}>
          <SelectTrigger>
            <SelectValue>
              <Badge className={selectedMethod?.color}>{method}</Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {httpMethods.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <Badge className={m.color}>{m.value}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldWrapper>

      {/* URL */}
      <FieldWrapper
        label="URL"
        hint="The URL to send the request to. You can use variables like {{data.field}}"
        required
      >
        <Input
          value={url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
          className="font-mono text-sm"
        />
      </FieldWrapper>

      {/* Headers */}
      <FieldWrapper
        label="Headers"
        hint="Request headers, one per line in format: Header-Name: value"
      >
        <Textarea
          value={headersString}
          onChange={(e) => onUpdate({ headers: parseHeaders(e.target.value) })}
          placeholder="Content-Type: application/json&#10;Authorization: Bearer {{credentials.token}}"
          className="min-h-[80px] font-mono text-sm"
        />
      </FieldWrapper>

      {/* Body - only for methods that support it */}
      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <FieldWrapper
          label="Request Body"
          hint="JSON body to send with the request. You can use variables."
        >
          <Textarea
            value={body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder='{"key": "value", "data": "{{trigger.data}}"}'
            className="min-h-[100px] font-mono text-sm"
          />
        </FieldWrapper>
      )}

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Using variables</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">{'{{trigger.data}}'}</code> - Data from trigger
          </li>
          <li>
            <code className="rounded bg-muted px-1">{'{{previousStep.result}}'}</code> - Previous step output
          </li>
          <li>
            <code className="rounded bg-muted px-1">{'{{env.API_KEY}}'}</code> - Environment variable
          </li>
        </ul>
      </div>
    </div>
  );
}
