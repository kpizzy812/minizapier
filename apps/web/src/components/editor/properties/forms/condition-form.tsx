'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '../components';
import { Check, X } from 'lucide-react';

interface ConditionFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function ConditionForm({ data, onUpdate }: ConditionFormProps) {
  const label = (data.label as string) || 'Condition';
  const expression = (data.expression as string) || '';

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Check if user is premium"
        />
      </FieldWrapper>

      {/* Condition expression */}
      <FieldWrapper
        label="Condition"
        hint="JavaScript expression that returns true or false"
        required
      >
        <Textarea
          value={expression}
          onChange={(e) => onUpdate({ expression: e.target.value })}
          placeholder="input.user.isPremium === true"
          className="min-h-[100px] font-mono text-sm"
        />
      </FieldWrapper>

      {/* Branch explanation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-green-500/10 p-3">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">True branch</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Executes when condition is true
          </p>
        </div>
        <div className="rounded-md bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">False branch</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Executes when condition is false
          </p>
        </div>
      </div>

      {/* Examples */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Condition examples</h4>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>
            <p className="font-medium">Check value:</p>
            <code className="block rounded bg-muted p-1">
              input.status === &quot;active&quot;
            </code>
          </li>
          <li>
            <p className="font-medium">Check number:</p>
            <code className="block rounded bg-muted p-1">
              input.amount &gt; 100
            </code>
          </li>
          <li>
            <p className="font-medium">Check existence:</p>
            <code className="block rounded bg-muted p-1">
              input.email !== undefined
            </code>
          </li>
          <li>
            <p className="font-medium">Multiple conditions:</p>
            <code className="block rounded bg-muted p-1">
              input.age &gt;= 18 &amp;&amp; input.country === &quot;US&quot;
            </code>
          </li>
          <li>
            <p className="font-medium">Check array:</p>
            <code className="block rounded bg-muted p-1">
              input.items.length &gt; 0
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}
