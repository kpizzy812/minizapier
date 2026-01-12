'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldWrapper, CredentialSelect } from '../components';
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
  const credentialId = data.credentialId as string | undefined;
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
        hint="GET = read, POST = send, PUT/PATCH = update, DELETE = remove"
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
        hint="API endpoint address"
        required
      >
        <TemplateInput
          value={url}
          onChange={(v) => onUpdate({ url: v })}
          placeholder="https://api.example.com/endpoint"
          sources={sources}
        />
      </FieldWrapper>

      {/* Authorization - optional */}
      <FieldWrapper
        label="Authorization (optional)"
        hint="Select authentication method for protected APIs"
      >
        <CredentialSelect
          value={credentialId}
          onChange={(id) => onUpdate({ credentialId: id })}
          credentialType={['HTTP_BEARER', 'HTTP_BASIC', 'HTTP_API_KEY']}
          placeholder="No authorization"
        />
      </FieldWrapper>

      {/* Headers */}
      <FieldWrapper
        label="Headers (optional)"
        hint="Additional headers. Each on a new line: Name: value"
      >
        <TemplateInput
          value={headers}
          onChange={(v) => onUpdate({ headers: v })}
          placeholder="Content-Type: application/json"
          sources={sources}
          multiline
          rows={3}
        />
      </FieldWrapper>

      {/* Body - only for methods that support it */}
      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <FieldWrapper
          label="Request Body"
          hint="Data to send in JSON format"
        >
          <TemplateInput
            value={body}
            onChange={(v) => onUpdate({ body: v })}
            placeholder='{"key": "value"}'
            sources={sources}
            multiline
            rows={4}
          />
        </FieldWrapper>
      )}

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Tip</h4>
        <p className="text-xs text-muted-foreground">
          Click the database icon next to a field to insert data from previous steps.
        </p>
      </div>
    </div>
  );
}
