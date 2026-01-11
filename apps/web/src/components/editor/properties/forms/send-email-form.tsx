'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from '../components';
import { TemplateInput } from '../../data-picker';
import { useAvailableData } from '@/hooks/use-available-data';

interface SendEmailFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function SendEmailForm({ data, onUpdate }: SendEmailFormProps) {
  const sources = useAvailableData();

  const label = (data.label as string) || 'Send Email';
  const to = (data.to as string) || '';
  const subject = (data.subject as string) || '';
  const body = (data.body as string) || '';

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Send notification email"
        />
      </FieldWrapper>

      {/* To */}
      <FieldWrapper
        label="To"
        hint="Recipient email address. You can use variables or separate multiple with comma."
        required
      >
        <TemplateInput
          value={to}
          onChange={(v) => onUpdate({ to: v })}
          placeholder="{{trigger.body.email}} or user@example.com"
          sources={sources}
        />
      </FieldWrapper>

      {/* Subject */}
      <FieldWrapper
        label="Subject"
        hint="Email subject line. Click the database icon to insert data."
        required
      >
        <TemplateInput
          value={subject}
          onChange={(v) => onUpdate({ subject: v })}
          placeholder="New order from {{trigger.body.customer}}"
          sources={sources}
        />
      </FieldWrapper>

      {/* Body */}
      <FieldWrapper
        label="Message"
        hint="Email body. You can use HTML or plain text with variables."
        required
      >
        <TemplateInput
          value={body}
          onChange={(v) => onUpdate({ body: v })}
          placeholder="Hello {{trigger.body.name}},&#10;&#10;You have received a new order..."
          sources={sources}
          multiline
          rows={6}
        />
      </FieldWrapper>

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Tips</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Use HTML tags for formatting (bold, links, etc.)</li>
          <li>• Variables are replaced with actual values when executed</li>
          <li>• Email credentials are configured in Settings</li>
        </ul>
      </div>
    </div>
  );
}
