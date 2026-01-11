'use client';

import { Input } from '@/components/ui/input';
import { FieldWrapper } from '../components';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WebhookTriggerFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function WebhookTriggerForm({ data, onUpdate }: WebhookTriggerFormProps) {
  const webhookUrl = data.webhookUrl as string | undefined;
  const label = (data.label as string) || 'Webhook Trigger';

  const copyToClipboard = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('Webhook URL copied to clipboard');
    }
  };

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="My Webhook"
        />
      </FieldWrapper>

      {/* Webhook URL - readonly, generated after save */}
      <FieldWrapper
        label="Webhook URL"
        hint="Send HTTP requests to this URL to trigger the workflow. URL is generated after saving."
      >
        {webhookUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs">
              <ExternalLink className="mr-1 h-3 w-3" />
              Ready to receive requests
            </Badge>
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <p>Webhook URL will be generated after you save the workflow.</p>
            <p className="mt-1 text-xs">
              You can send POST, GET, or any HTTP request to trigger this workflow.
            </p>
          </div>
        )}
      </FieldWrapper>

      {/* Secret for signature verification */}
      <FieldWrapper
        label="Secret Key (optional)"
        hint="A password to verify requests come from trusted sources. Leave empty if not needed."
      >
        <Input
          type="password"
          value={(data.secret as string) || ''}
          onChange={(e) => onUpdate({ secret: e.target.value })}
          placeholder="Enter secret key..."
        />
      </FieldWrapper>

      {/* Help section */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">How to use</h4>
        <ol className="space-y-1 text-xs text-muted-foreground">
          <li>1. Save your workflow to generate the webhook URL</li>
          <li>2. Send HTTP requests to the URL from your app or service</li>
          <li>3. The workflow will run with the request data</li>
        </ol>
      </div>
    </div>
  );
}
