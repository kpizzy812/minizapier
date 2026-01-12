'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from '../components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateInput } from '../../data-picker';
import type { DataSource } from '../../data-picker';

interface TransformFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  dataSources: DataSource[];
}

export function TransformForm({ data, onUpdate, dataSources }: TransformFormProps) {
  const label = (data.label as string) || 'Transform';
  const expression = (data.expression as string) || '';
  const transformType = (data.transformType as string) || 'template';

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Format response data"
        />
      </FieldWrapper>

      {/* Transform type */}
      <FieldWrapper
        label="Transform Type"
        hint="Choose how to transform the data"
      >
        <Tabs
          value={transformType}
          onValueChange={(v) => onUpdate({ transformType: v })}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="jsonpath">Path</TabsTrigger>
            <TabsTrigger value="javascript">Code</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-3">
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground mb-3">
              Build output using data from previous steps.
              Click the <span className="font-medium">database icon</span> to insert fields.
            </div>
          </TabsContent>

          <TabsContent value="jsonpath" className="mt-3">
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground mb-3">
              Extract specific data using a path expression.
              <br />
              Example: <code>$.data.items[0].name</code>
            </div>
          </TabsContent>

          <TabsContent value="javascript" className="mt-3">
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground mb-3">
              Write JavaScript code. Return the transformed value.
              <br />
              Available: <code>input</code> (previous step data)
            </div>
          </TabsContent>
        </Tabs>
      </FieldWrapper>

      {/* Expression input with Data Picker */}
      <FieldWrapper
        label={transformType === 'template' ? 'Output Template' : 'Expression'}
        hint={
          transformType === 'template'
            ? 'Use {{path}} to insert data from previous steps'
            : transformType === 'jsonpath'
              ? 'JSONPath expression to extract data'
              : 'JavaScript code that returns the transformed data'
        }
        required
      >
        <TemplateInput
          value={expression}
          onChange={(v) => onUpdate({ expression: v })}
          placeholder={
            transformType === 'template'
              ? 'Hello {{trigger.body.name}}, your order #{{trigger.body.orderId}} is confirmed!'
              : transformType === 'jsonpath'
                ? '$.data.results[*].name'
                : '// Transform the input data\nreturn {\n  name: input.firstName + " " + input.lastName\n};'
          }
          sources={dataSources}
          multiline
          rows={transformType === 'javascript' ? 6 : 3}
        />
      </FieldWrapper>

      {/* Examples based on type */}
      {transformType === 'template' && (
        <div className="rounded-md border border-dashed p-3">
          <h4 className="mb-2 text-sm font-medium">Template examples</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <p className="font-medium">Simple text:</p>
              <code className="block rounded bg-muted p-1">
                Order {'{{trigger.body.id}}'} from {'{{trigger.body.customer}}'}
              </code>
            </li>
            <li>
              <p className="font-medium">JSON output:</p>
              <code className="block rounded bg-muted p-1">
                {'{'}
                {'"name": "{{http.data.name}}", "email": "{{http.data.email}}"'}
                {'}'}
              </code>
            </li>
          </ul>
        </div>
      )}

      {transformType === 'jsonpath' && (
        <div className="rounded-md border border-dashed p-3">
          <h4 className="mb-2 text-sm font-medium">Path examples</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1">$.data</code> - Get
              &quot;data&quot; field
            </li>
            <li>
              <code className="rounded bg-muted px-1">$.items[0]</code> - First
              item in list
            </li>
            <li>
              <code className="rounded bg-muted px-1">$.items[*].name</code> -
              All names from items
            </li>
            <li>
              <code className="rounded bg-muted px-1">$..email</code> - Find all
              emails anywhere
            </li>
          </ul>
        </div>
      )}

      {transformType === 'javascript' && (
        <div className="rounded-md border border-dashed p-3">
          <h4 className="mb-2 text-sm font-medium">JavaScript examples</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <p className="font-medium">Extract fields:</p>
              <code className="block rounded bg-muted p-1">
                return {'{'} id: input.data.id, name: input.data.name {'}'};
              </code>
            </li>
            <li>
              <p className="font-medium">Filter array:</p>
              <code className="block rounded bg-muted p-1">
                return input.items.filter(item =&gt; item.active);
              </code>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
