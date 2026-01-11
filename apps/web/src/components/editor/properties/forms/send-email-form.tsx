'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '../components';

interface SendEmailFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function SendEmailForm({ data, onUpdate }: SendEmailFormProps) {
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
        hint="Recipient email address. For multiple recipients, separate with comma."
        required
      >
        <Input
          type="email"
          value={to}
          onChange={(e) => onUpdate({ to: e.target.value })}
          placeholder="user@example.com, another@example.com"
        />
      </FieldWrapper>

      {/* Subject */}
      <FieldWrapper
        label="Subject"
        hint="Email subject line. You can use variables like {{data.name}}"
        required
      >
        <Input
          value={subject}
          onChange={(e) => onUpdate({ subject: e.target.value })}
          placeholder="New order from {{trigger.data.customer}}"
        />
      </FieldWrapper>

      {/* Body */}
      <FieldWrapper
        label="Message"
        hint="Email body. You can use HTML or plain text."
        required
      >
        <Textarea
          value={body}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder="Hello,&#10;&#10;You have received a new order...&#10;&#10;Order details: {{trigger.data}}"
          className="min-h-[150px]"
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
