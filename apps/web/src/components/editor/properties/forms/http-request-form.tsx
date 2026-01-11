'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldWrapper } from '../components';
import { Badge } from '@/components/ui/badge';
import { TemplateInput } from '../../data-picker';
import { useAvailableData } from '@/hooks/use-available-data';

interface HttpRequestFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

const httpMethods = [
  { value: 'GET', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  { value: 'POST', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  { value: 'PUT', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  {
    value: 'PATCH',
    color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  },
  { value: 'DELETE', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
];

export function HttpRequestForm({ data, onUpdate }: HttpRequestFormProps) {
  const sources = useAvailableData();

  const label = (data.label as string) || 'HTTP Request';
  const method = (data.method as string) || 'GET';
  const url = (data.url as string) || '';
  const headers = (data.headers as string) || '';
  const body = (data.body as string) || '';

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
      <FieldWrapper
        label="Method"
        hint="GET = read data, POST = send data, PUT/PATCH = update, DELETE = remove"
        required
      >
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
        hint="The URL to send the request to. Click the database icon to insert data from previous steps."
        required
      >
        <TemplateInput
          value={url}
          onChange={(v) => onUpdate({ url: v })}
          placeholder="https://api.example.com/endpoint"
          sources={sources}
        />
      </FieldWrapper>

      {/* Headers */}
      <FieldWrapper
        label="Headers (optional)"
        hint="Extra headers to send. One per line: Name: value"
      >
        <TemplateInput
          value={headers}
          onChange={(v) => onUpdate({ headers: v })}
          placeholder="Content-Type: application/json&#10;Authorization: Bearer {{trigger.body.token}}"
          sources={sources}
          multiline
          rows={3}
        />
      </FieldWrapper>

      {/* Body - only for methods that support it */}
      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <FieldWrapper
          label="Request Body"
          hint="JSON body to send with the request. Click the database icon to insert data."
        >
          <TemplateInput
            value={body}
            onChange={(v) => onUpdate({ body: v })}
            placeholder='{"key": "value", "userId": "{{trigger.body.id}}"}'
            sources={sources}
            multiline
            rows={4}
          />
        </FieldWrapper>
      )}

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Using variables</h4>
        <p className="text-xs text-muted-foreground mb-2">
          Click the{' '}
          <span className="inline-flex items-center bg-muted px-1.5 rounded">
            <svg
              className="h-3 w-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
            icon
          </span>{' '}
          to browse and insert data from previous steps.
        </p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">{'{{trigger.body}}'}</code> -
            Data from trigger
          </li>
          <li>
            <code className="rounded bg-muted px-1">
              {'{{nodeId.output.field}}'}
            </code>{' '}
            - Data from previous step
          </li>
        </ul>
      </div>
    </div>
  );
}
