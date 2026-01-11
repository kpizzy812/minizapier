'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from '../components';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EmailTriggerFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function EmailTriggerForm({ data, onUpdate }: EmailTriggerFormProps) {
  const address = data.address as string | undefined;
  const label = (data.label as string) || 'Email Trigger';

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success('Email address copied to clipboard');
    }
  };

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="My Email Trigger"
        />
      </FieldWrapper>

      {/* Email address - readonly, generated after save */}
      <FieldWrapper
        label="Trigger Email Address"
        hint="Send emails to this address to trigger the workflow. Address is generated after saving."
      >
        {address ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={address}
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copy address"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Mail className="mr-1 h-3 w-3" />
              Ready to receive emails
            </Badge>
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <p>Email address will be generated after you save the workflow.</p>
            <p className="mt-1 text-xs">
              Any email sent to this address will trigger the workflow.
            </p>
          </div>
        )}
      </FieldWrapper>

      {/* Available data */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">Available data in workflow</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li><code className="rounded bg-muted px-1">from</code> - Sender email</li>
          <li><code className="rounded bg-muted px-1">subject</code> - Email subject</li>
          <li><code className="rounded bg-muted px-1">text</code> - Plain text body</li>
          <li><code className="rounded bg-muted px-1">html</code> - HTML body</li>
          <li><code className="rounded bg-muted px-1">attachments</code> - List of attachments</li>
        </ul>
      </div>
    </div>
  );
}
