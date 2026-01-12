'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '../components';
import { ConditionBuilder } from '../components/condition-builder';
import { Check, X, Code, Wand2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DataSource } from '../../data-picker';

interface ConditionFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  dataSources: DataSource[];
}

export function ConditionForm({ data, onUpdate, dataSources }: ConditionFormProps) {
  const label = (data.label as string) || 'Condition';
  const expression = (data.expression as string) || '';
  const mode = (data.conditionMode as string) || 'visual';

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

      {/* Mode selector */}
      <Tabs
        value={mode}
        onValueChange={(v) => onUpdate({ conditionMode: v })}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual" className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Code
          </TabsTrigger>
        </TabsList>

        {/* Visual builder */}
        <TabsContent value="visual" className="mt-4">
          <ConditionBuilder
            expression={expression}
            onChange={(expr) => onUpdate({ expression: expr })}
            dataSources={dataSources}
          />
        </TabsContent>

        {/* Code mode */}
        <TabsContent value="code" className="mt-4">
          <FieldWrapper
            label="Expression"
            hint="JavaScript expression that returns true or false"
            required
          >
            <Textarea
              value={expression}
              onChange={(e) => onUpdate({ expression: e.target.value })}
              placeholder="{{trigger.body.status}} === 'active'"
              className="min-h-[100px] font-mono text-sm"
            />
          </FieldWrapper>

          {/* Code examples */}
          <div className="mt-3 rounded-md border border-dashed p-3">
            <h4 className="mb-2 text-sm font-medium">Examples</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1">
                  {'{{trigger.body.status}}'} === &quot;active&quot;
                </code>
              </li>
              <li>
                <code className="rounded bg-muted px-1">
                  {'{{http.data.count}}'} &gt; 100
                </code>
              </li>
              <li>
                <code className="rounded bg-muted px-1">
                  {'{{trigger.body.email}}'}.includes(&quot;@gmail&quot;)
                </code>
              </li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Branch explanation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-green-500/10 p-3">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">True</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When condition is true
          </p>
        </div>
        <div className="rounded-md bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">False</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When condition is false
          </p>
        </div>
      </div>
    </div>
  );
}
