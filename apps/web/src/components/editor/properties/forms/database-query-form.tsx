'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper, CredentialSelect } from '../components';
import { TemplateInput } from '../../data-picker';
import { useAvailableData } from '@/hooks/use-available-data';

interface DatabaseQueryFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function DatabaseQueryForm({ data, onUpdate }: DatabaseQueryFormProps) {
  const sources = useAvailableData();

  const label = (data.label as string) || 'Database Query';
  const credentialId = data.credentialId as string | undefined;
  const query = (data.query as string) || '';
  const params = (data.params as string) || '';

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Get user data"
        />
      </FieldWrapper>

      {/* Database Credential */}
      <FieldWrapper
        label="Database"
        hint="Select database connection"
        required
      >
        <CredentialSelect
          value={credentialId}
          onChange={(id) => onUpdate({ credentialId: id })}
          credentialType="DATABASE"
        />
      </FieldWrapper>

      {/* SQL Query */}
      <FieldWrapper
        label="SQL Query"
        hint="SQL query. Use $1, $2, etc. for parameters"
        required
      >
        <TemplateInput
          value={query}
          onChange={(v) => onUpdate({ query: v })}
          placeholder="SELECT * FROM users WHERE email = $1"
          sources={sources}
          multiline
          rows={5}
        />
      </FieldWrapper>

      {/* Query parameters */}
      <FieldWrapper
        label="Parameters (optional)"
        hint="Values for $1, $2, etc. Each on a new line"
      >
        <TemplateInput
          value={params}
          onChange={(v) => onUpdate({ params: v })}
          placeholder="value1&#10;value2"
          sources={sources}
          multiline
          rows={3}
        />
      </FieldWrapper>

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Using parameters</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">$1</code> - First parameter
            (first line in Parameters)
          </li>
          <li>
            <code className="rounded bg-muted px-1">$2</code> - Second parameter
            (second line)
          </li>
          <li>Parameters are safely escaped to prevent SQL injection</li>
        </ul>
      </div>

      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Output</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">rows</code> - Array of
            result rows
          </li>
          <li>
            <code className="rounded bg-muted px-1">rowCount</code> - Number of
            affected rows
          </li>
          <li>
            <code className="rounded bg-muted px-1">fields</code> - Column names
          </li>
        </ul>
      </div>
    </div>
  );
}
