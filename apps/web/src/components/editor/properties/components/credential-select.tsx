'use client';

import { useState } from 'react';
import { Plus, Key, AlertCircle, ExternalLink, Mail, Globe, Database, Bot, Send, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CredentialDialog } from '@/components/credentials';
import { useCredentials } from '@/hooks/use-credentials';
import { Credential, CredentialType } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CredentialSelectProps {
  value: string | undefined;
  onChange: (credentialId: string | undefined) => void;
  /** Single type or array of types to show */
  credentialType: CredentialType | CredentialType[];
  placeholder?: string;
  className?: string;
}

// Human-readable names and icons for credential types
const credentialTypeConfig: Record<CredentialType, {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
}> = {
  TELEGRAM: {
    label: 'Telegram Bot',
    shortLabel: 'Telegram',
    icon: <Bot className="h-3.5 w-3.5" />,
    color: 'bg-blue-500/10 text-blue-600',
  },
  SMTP: {
    label: 'SMTP Server',
    shortLabel: 'SMTP',
    icon: <Mail className="h-3.5 w-3.5" />,
    color: 'bg-orange-500/10 text-orange-600',
  },
  HTTP_BASIC: {
    label: 'HTTP Basic Auth',
    shortLabel: 'Basic',
    icon: <Globe className="h-3.5 w-3.5" />,
    color: 'bg-green-500/10 text-green-600',
  },
  HTTP_BEARER: {
    label: 'Bearer Token',
    shortLabel: 'Bearer',
    icon: <Key className="h-3.5 w-3.5" />,
    color: 'bg-purple-500/10 text-purple-600',
  },
  HTTP_API_KEY: {
    label: 'API Key',
    shortLabel: 'API Key',
    icon: <Key className="h-3.5 w-3.5" />,
    color: 'bg-yellow-500/10 text-yellow-600',
  },
  DATABASE: {
    label: 'Database',
    shortLabel: 'Database',
    icon: <Database className="h-3.5 w-3.5" />,
    color: 'bg-red-500/10 text-red-600',
  },
  RESEND: {
    label: 'Resend Email',
    shortLabel: 'Resend',
    icon: <Send className="h-3.5 w-3.5" />,
    color: 'bg-pink-500/10 text-pink-600',
  },
  AI: {
    label: 'AI Provider',
    shortLabel: 'AI',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: 'bg-violet-500/10 text-violet-600',
  },
};

export function CredentialSelect({
  value,
  onChange,
  credentialType,
  placeholder,
  className,
}: CredentialSelectProps) {
  const { data: credentials = [], isLoading } = useCredentials();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaultType, setDialogDefaultType] = useState<CredentialType | undefined>();

  // Normalize to array
  const types = Array.isArray(credentialType) ? credentialType : [credentialType];
  const isMultiType = types.length > 1;

  // Filter credentials by types
  const filteredCredentials = credentials.filter(
    (c: Credential) => types.includes(c.type)
  );

  // Group credentials by type for multi-type selectors
  const groupedCredentials = types.reduce((acc, type) => {
    acc[type] = filteredCredentials.filter((c: Credential) => c.type === type);
    return acc;
  }, {} as Record<CredentialType, Credential[]>);

  const selectedCredential = filteredCredentials.find(
    (c: Credential) => c.id === value
  );

  const handleCreateSuccess = (newCredential: Credential) => {
    onChange(newCredential.id);
    setDialogOpen(false);
  };

  const openCreateDialog = (type?: CredentialType) => {
    setDialogDefaultType(type || types[0]);
    setDialogOpen(true);
  };

  const defaultPlaceholder = placeholder || (
    isMultiType
      ? 'Select credentials'
      : `Select ${credentialTypeConfig[types[0]].label}`
  );

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={value || ''}
        onValueChange={(v) => onChange(v || undefined)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={defaultPlaceholder}>
            {selectedCredential && (
              <div className="flex items-center gap-2">
                {credentialTypeConfig[selectedCredential.type].icon}
                <span>{selectedCredential.name}</span>
                {isMultiType && (
                  <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', credentialTypeConfig[selectedCredential.type].color)}>
                    {credentialTypeConfig[selectedCredential.type].shortLabel}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No saved credentials
              </p>
              {isMultiType && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Create {types.map(t => credentialTypeConfig[t].label).join(' or ')}
                </p>
              )}
            </div>
          ) : isMultiType ? (
            // Grouped view for multiple types
            types.map((type) => {
              const typeCredentials = groupedCredentials[type];
              if (typeCredentials.length === 0) return null;

              return (
                <SelectGroup key={type}>
                  <SelectLabel className="flex items-center gap-2 text-xs">
                    {credentialTypeConfig[type].icon}
                    {credentialTypeConfig[type].label}
                  </SelectLabel>
                  {typeCredentials.map((credential: Credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      <div className="flex items-center gap-2">
                        <span>{credential.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })
          ) : (
            // Simple list for single type
            filteredCredentials.map((credential: Credential) => (
              <SelectItem key={credential.id} value={credential.id}>
                <div className="flex items-center gap-2">
                  {credentialTypeConfig[credential.type].icon}
                  <span>{credential.name}</span>
                </div>
              </SelectItem>
            ))
          )}

          {/* Create new button(s) */}
          <div className="border-t p-1">
            {isMultiType ? (
              // Multiple create buttons for multi-type
              <div className="space-y-1">
                <p className="px-2 py-1 text-xs text-muted-foreground">Create new:</p>
                {types.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openCreateDialog(type);
                    }}
                  >
                    {credentialTypeConfig[type].icon}
                    {credentialTypeConfig[type].label}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openCreateDialog();
                }}
              >
                <Plus className="h-4 w-4" />
                Create new credentials
              </Button>
            )}
          </div>
        </SelectContent>
      </Select>

      {/* Link to settings if no credentials */}
      {!isLoading && filteredCredentials.length === 0 && !value && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Or configure in{' '}
          <a href="/settings" className="text-primary underline">
            Settings
          </a>
        </p>
      )}

      {/* Credential dialog */}
      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={dialogDefaultType}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
