'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '../components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TransformFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function TransformForm({ data, onUpdate }: TransformFormProps) {
  const label = (data.label as string) || 'Transform';
  const expression = (data.expression as string) || '';
  const transformType = (data.transformType as string) || 'javascript';

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="javascript">Code</TabsTrigger>
            <TabsTrigger value="jsonpath">Extract Path</TabsTrigger>
          </TabsList>

          <TabsContent value="javascript" className="mt-3">
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              Write JavaScript code. Return the transformed value.
              <br />
              Available: <code>input</code> (previous step data)
            </div>
          </TabsContent>

          <TabsContent value="jsonpath" className="mt-3">
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              Extract specific data using a path expression (no coding required).
              <br />
              Example: <code>$.data.items[0].name</code>
            </div>
          </TabsContent>
        </Tabs>
      </FieldWrapper>

      {/* Expression */}
      <FieldWrapper
        label="Expression"
        hint={
          transformType === 'javascript'
            ? 'JavaScript code that returns the transformed data'
            : 'JSONPath expression to extract data'
        }
        required
      >
        <Textarea
          value={expression}
          onChange={(e) => onUpdate({ expression: e.target.value })}
          placeholder={
            transformType === 'javascript'
              ? '// Transform the input data\nreturn {\n  name: input.firstName + " " + input.lastName,\n  email: input.email.toLowerCase()\n};'
              : '$.data.results[*].name'
          }
          className="min-h-[150px] font-mono text-sm"
        />
      </FieldWrapper>

      {/* Examples based on type */}
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
            <li>
              <p className="font-medium">Map array:</p>
              <code className="block rounded bg-muted p-1">
                return input.users.map(u =&gt; u.email);
              </code>
            </li>
          </ul>
        </div>
      )}

      {transformType === 'jsonpath' && (
        <div className="rounded-md border border-dashed p-3">
          <h4 className="mb-2 text-sm font-medium">Path examples</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li><code className="rounded bg-muted px-1">$.data</code> - Get &quot;data&quot; field</li>
            <li><code className="rounded bg-muted px-1">$.items[0]</code> - First item in list</li>
            <li><code className="rounded bg-muted px-1">$.items[*].name</code> - All names from items</li>
            <li><code className="rounded bg-muted px-1">$..email</code> - Find all emails anywhere</li>
          </ul>
        </div>
      )}
    </div>
  );
}
