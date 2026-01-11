'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '../components';
import { AlertTriangle } from 'lucide-react';

interface DatabaseQueryFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function DatabaseQueryForm({ data, onUpdate }: DatabaseQueryFormProps) {
  const label = (data.label as string) || 'Database Query';
  const query = (data.query as string) || '';

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

      {/* SQL Query */}
      <FieldWrapper
        label="SQL Query"
        hint="SQL query to execute. Use $1, $2, etc. for parameters."
        required
      >
        <Textarea
          value={query}
          onChange={(e) => onUpdate({ query: e.target.value })}
          placeholder="SELECT * FROM users WHERE email = $1"
          className="min-h-[150px] font-mono text-sm"
        />
      </FieldWrapper>

      {/* Security warning */}
      <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="text-xs">
          <p className="font-medium">Security notice</p>
          <p className="mt-1">
            Always use parameterized queries ($1, $2, etc.) instead of string
            concatenation to prevent SQL injection attacks.
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Using parameters</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">$1</code> - First parameter
          </li>
          <li>
            <code className="rounded bg-muted px-1">$2</code> - Second parameter
          </li>
          <li>Parameters are passed from previous steps or trigger data</li>
        </ul>
      </div>

      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Output</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li><code className="rounded bg-muted px-1">rows</code> - Array of result rows</li>
          <li><code className="rounded bg-muted px-1">rowCount</code> - Number of affected rows</li>
          <li><code className="rounded bg-muted px-1">fields</code> - Column names</li>
        </ul>
      </div>
    </div>
  );
}
