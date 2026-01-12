'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper, CredentialSelect } from '../components';
import { TemplateInput } from '../../data-picker';
import { useAvailableData } from '@/hooks/use-available-data';

interface SendEmailFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function SendEmailForm({ data, onUpdate }: SendEmailFormProps) {
  const sources = useAvailableData();

  const label = (data.label as string) || 'Send Email';
  const credentialId = data.credentialId as string | undefined;
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

      {/* Email Credential - optional, supports RESEND or SMTP */}
      <FieldWrapper
        label="Email Account (optional)"
        hint="Select Resend API or SMTP server for sending"
      >
        <CredentialSelect
          value={credentialId}
          onChange={(id) => onUpdate({ credentialId: id })}
          credentialType={['RESEND', 'SMTP']}
          placeholder="Use default"
        />
      </FieldWrapper>

      {/* To */}
      <FieldWrapper
        label="To"
        hint="Recipient email. Multiple addresses separated by comma"
        required
      >
        <TemplateInput
          value={to}
          onChange={(v) => onUpdate({ to: v })}
          placeholder="user@example.com"
          sources={sources}
        />
      </FieldWrapper>

      {/* Subject */}
      <FieldWrapper
        label="Subject"
        hint="Email subject line"
        required
      >
        <TemplateInput
          value={subject}
          onChange={(v) => onUpdate({ subject: v })}
          placeholder="Email subject"
          sources={sources}
        />
      </FieldWrapper>

      {/* Body */}
      <FieldWrapper
        label="Message"
        hint="Email body. HTML is supported"
        required
      >
        <TemplateInput
          value={body}
          onChange={(v) => onUpdate({ body: v })}
          placeholder="Hello! Your order has been received..."
          sources={sources}
          multiline
          rows={6}
        />
      </FieldWrapper>

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Tips</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Use HTML tags for formatting</li>
          <li>• Click the database icon to insert data from previous steps</li>
        </ul>
      </div>
    </div>
  );
}
