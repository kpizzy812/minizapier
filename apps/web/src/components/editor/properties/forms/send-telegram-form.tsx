'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from '../components';
import { TemplateInput } from '../../data-picker';
import { useAvailableData } from '@/hooks/use-available-data';

interface SendTelegramFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function SendTelegramForm({ data, onUpdate }: SendTelegramFormProps) {
  const sources = useAvailableData();

  const label = (data.label as string) || 'Telegram Message';
  const chatId = (data.chatId as string) || '';
  const message = (data.message as string) || '';

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Send Telegram alert"
        />
      </FieldWrapper>

      {/* Chat ID */}
      <FieldWrapper
        label="Chat ID"
        hint="Telegram chat ID. Can be from data or hardcoded (e.g., @mychannel)"
        required
      >
        <TemplateInput
          value={chatId}
          onChange={(v) => onUpdate({ chatId: v })}
          placeholder="{{trigger.body.chatId}} or 123456789"
          sources={sources}
        />
      </FieldWrapper>

      {/* Message */}
      <FieldWrapper
        label="Message"
        hint="Message text to send. Supports Markdown formatting and variables."
        required
      >
        <TemplateInput
          value={message}
          onChange={(v) => onUpdate({ message: v })}
          placeholder="*New Alert*&#10;&#10;{{trigger.body.message}}"
          sources={sources}
          multiline
          rows={5}
        />
      </FieldWrapper>

      {/* Tips */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">How to get Chat ID</h4>
        <ol className="space-y-1 text-xs text-muted-foreground">
          <li>1. Start a chat with @userinfobot on Telegram</li>
          <li>2. It will reply with your Chat ID</li>
          <li>3. For groups: add the bot to group and send /id</li>
        </ol>
      </div>

      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Markdown formatting</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">*bold*</code> - Bold text
          </li>
          <li>
            <code className="rounded bg-muted px-1">_italic_</code> - Italic
            text
          </li>
          <li>
            <code className="rounded bg-muted px-1">`code`</code> - Inline code
          </li>
          <li>
            <code className="rounded bg-muted px-1">[text](url)</code> - Links
          </li>
        </ul>
      </div>
    </div>
  );
}
