'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, Bell, BellOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateWorkflow } from '@/hooks/use-workflows';

interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
  notificationEmail?: string | null;
}

export function WorkflowSettingsDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  notificationEmail,
}: WorkflowSettingsDialogProps) {
  const updateWorkflow = useUpdateWorkflow();

  const [emailEnabled, setEmailEnabled] = useState(!!notificationEmail);
  const [email, setEmail] = useState(notificationEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens or props change
  useEffect(() => {
    if (open) {
      setEmailEnabled(!!notificationEmail);
      setEmail(notificationEmail || '');
    }
  }, [open, notificationEmail]);

  const handleEmailToggle = (enabled: boolean) => {
    setEmailEnabled(enabled);
    if (!enabled) {
      setEmail('');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email if enabled
    if (emailEnabled && email.trim()) {
      if (!validateEmail(email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const newNotificationEmail = emailEnabled && email.trim() ? email.trim() : null;

      await updateWorkflow.mutateAsync({
        id: workflowId,
        input: { notificationEmail: newNotificationEmail },
      });

      if (newNotificationEmail) {
        toast.success('Error notifications enabled');
      } else {
        toast.success('Error notifications disabled');
      }

      onOpenChange(false);
    } catch {
      toast.error('Failed to update workflow settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Workflow Settings</DialogTitle>
            <DialogDescription>
              Configure settings for &quot;{workflowName}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Error Notifications Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Error Notifications</h3>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-sm font-medium">
                      Email on Error
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive email when workflow execution fails
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailEnabled}
                    onCheckedChange={handleEmailToggle}
                  />
                </div>

                {emailEnabled && (
                  <div className="grid gap-2 pt-2 border-t">
                    <Label htmlFor="notification-email">Notification Email</Label>
                    <div className="relative">
                      <Input
                        id="notification-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-10"
                      />
                      {email && validateEmail(email) && (
                        <Bell className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                      {email && !validateEmail(email) && (
                        <BellOff className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Error details will be sent to this address when the workflow fails
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
