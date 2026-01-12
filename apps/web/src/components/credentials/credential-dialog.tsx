'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useCreateCredential,
  useUpdateCredential,
} from '@/hooks/use-credentials';
import {
  Credential,
  CredentialType,
  CredentialData,
  TelegramCredentialData,
  SmtpCredentialData,
  HttpBasicCredentialData,
  HttpBearerCredentialData,
  HttpApiKeyCredentialData,
  DatabaseCredentialData,
  ResendCredentialData,
  AICredentialData,
} from '@/lib/api';

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: Credential | null;
  /** Pre-selected credential type (for creating from action forms) */
  defaultType?: CredentialType;
  /** Callback when credential is successfully created/updated */
  onSuccess?: (credential: Credential) => void;
}

// Credential type options
const credentialTypes: { value: CredentialType; label: string; description: string }[] = [
  { value: 'TELEGRAM', label: 'Telegram Bot', description: 'Bot token for Telegram API' },
  { value: 'SMTP', label: 'SMTP Server', description: 'SMTP server for sending emails' },
  { value: 'HTTP_BASIC', label: 'HTTP Basic Auth', description: 'Username and password for HTTP requests' },
  { value: 'HTTP_BEARER', label: 'HTTP Bearer Token', description: 'Bearer token for HTTP requests' },
  { value: 'HTTP_API_KEY', label: 'API Key', description: 'API key for HTTP requests' },
  { value: 'DATABASE', label: 'Database', description: 'PostgreSQL connection string' },
  { value: 'RESEND', label: 'Resend Email', description: 'Resend API key for sending emails' },
  { value: 'AI', label: 'AI Provider', description: 'OpenAI-compatible API (DeepSeek, OpenAI, etc.)' },
];

// Default values for each credential type
function getDefaultData(type: CredentialType): CredentialData {
  switch (type) {
    case 'TELEGRAM':
      return { botToken: '' } as TelegramCredentialData;
    case 'SMTP':
      return { host: '', port: 587, username: '', password: '', secure: false } as SmtpCredentialData;
    case 'HTTP_BASIC':
      return { username: '', password: '' } as HttpBasicCredentialData;
    case 'HTTP_BEARER':
      return { token: '' } as HttpBearerCredentialData;
    case 'HTTP_API_KEY':
      return { apiKey: '', headerName: 'X-API-Key' } as HttpApiKeyCredentialData;
    case 'DATABASE':
      return { connectionString: '' } as DatabaseCredentialData;
    case 'RESEND':
      return { apiKey: '' } as ResendCredentialData;
    case 'AI':
      return { apiKey: '', baseUrl: '', model: '' } as AICredentialData;
  }
}

export function CredentialDialog({
  open,
  onOpenChange,
  credential,
  defaultType,
  onSuccess,
}: CredentialDialogProps) {
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();

  const isEditing = !!credential;
  // If defaultType is provided, lock to that type
  const isTypeLocked = !!defaultType && !isEditing;

  const [name, setName] = useState('');
  const [type, setType] = useState<CredentialType>(defaultType || 'TELEGRAM');
  const [data, setData] = useState<CredentialData>(getDefaultData(defaultType || 'TELEGRAM'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes or credential changes
  useEffect(() => {
    if (open) {
      if (credential) {
        setName(credential.name);
        setType(credential.type);
        // For editing, we don't have the actual data (it's encrypted on server)
        // So we use default values - user needs to re-enter
        setData(getDefaultData(credential.type));
      } else {
        const initialType = defaultType || 'TELEGRAM';
        setName('');
        setType(initialType);
        setData(getDefaultData(initialType));
      }
    }
  }, [open, credential, defaultType]);

  // Update data when type changes
  const handleTypeChange = (newType: CredentialType) => {
    setType(newType);
    setData(getDefaultData(newType));
  };

  // Update specific field in data
  const updateDataField = (field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Validate required fields based on type
    if (!validateData()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && credential) {
        const updated = await updateCredential.mutateAsync({
          id: credential.id,
          input: { name, data },
        });
        toast.success('Credential updated');
        onSuccess?.(updated);
      } else {
        const created = await createCredential.mutateAsync({ name, type, data });
        toast.success('Credential created');
        onSuccess?.(created);
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update credential' : 'Failed to create credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate data based on type
  const validateData = (): boolean => {
    switch (type) {
      case 'TELEGRAM': {
        const d = data as TelegramCredentialData;
        if (!d.botToken?.trim()) {
          toast.error('Please enter bot token');
          return false;
        }
        return true;
      }
      case 'SMTP': {
        const d = data as SmtpCredentialData;
        if (!d.host?.trim()) {
          toast.error('Please enter SMTP host');
          return false;
        }
        if (!d.port || d.port <= 0) {
          toast.error('Please enter valid port');
          return false;
        }
        if (!d.username?.trim()) {
          toast.error('Please enter username');
          return false;
        }
        if (!d.password?.trim()) {
          toast.error('Please enter password');
          return false;
        }
        return true;
      }
      case 'HTTP_BASIC': {
        const d = data as HttpBasicCredentialData;
        if (!d.username?.trim()) {
          toast.error('Please enter username');
          return false;
        }
        if (!d.password?.trim()) {
          toast.error('Please enter password');
          return false;
        }
        return true;
      }
      case 'HTTP_BEARER': {
        const d = data as HttpBearerCredentialData;
        if (!d.token?.trim()) {
          toast.error('Please enter bearer token');
          return false;
        }
        return true;
      }
      case 'HTTP_API_KEY': {
        const d = data as HttpApiKeyCredentialData;
        if (!d.apiKey?.trim()) {
          toast.error('Please enter API key');
          return false;
        }
        return true;
      }
      case 'DATABASE': {
        const d = data as DatabaseCredentialData;
        if (!d.connectionString?.trim()) {
          toast.error('Please enter connection string');
          return false;
        }
        return true;
      }
      case 'RESEND': {
        const d = data as ResendCredentialData;
        if (!d.apiKey?.trim()) {
          toast.error('Please enter Resend API key');
          return false;
        }
        return true;
      }
      case 'AI': {
        const d = data as AICredentialData;
        if (!d.apiKey?.trim()) {
          toast.error('Please enter AI API key');
          return false;
        }
        return true;
      }
    }
  };

  // Render form fields based on credential type
  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'TELEGRAM':
        return (
          <TelegramForm
            data={data as TelegramCredentialData}
            onChange={updateDataField}
          />
        );
      case 'SMTP':
        return (
          <SmtpForm
            data={data as SmtpCredentialData}
            onChange={updateDataField}
          />
        );
      case 'HTTP_BASIC':
        return (
          <HttpBasicForm
            data={data as HttpBasicCredentialData}
            onChange={updateDataField}
          />
        );
      case 'HTTP_BEARER':
        return (
          <HttpBearerForm
            data={data as HttpBearerCredentialData}
            onChange={updateDataField}
          />
        );
      case 'HTTP_API_KEY':
        return (
          <HttpApiKeyForm
            data={data as HttpApiKeyCredentialData}
            onChange={updateDataField}
          />
        );
      case 'DATABASE':
        return (
          <DatabaseForm
            data={data as DatabaseCredentialData}
            onChange={updateDataField}
          />
        );
      case 'RESEND':
        return (
          <ResendForm
            data={data as ResendCredentialData}
            onChange={updateDataField}
          />
        );
      case 'AI':
        return (
          <AIForm
            data={data as AICredentialData}
            onChange={updateDataField}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Credential' : 'Add Credential'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update credential settings. Re-enter sensitive data to update it.'
                : 'Add a new credential to connect external services.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name field */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Credential"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Type selector (only for new credentials, hidden if type is locked) */}
            {!isEditing && !isTypeLocked && (
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => handleTypeChange(v as CredentialType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentialTypes.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        <div className="flex flex-col">
                          <span>{ct.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {ct.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Show type label when locked */}
            {isTypeLocked && (
              <div className="grid gap-2">
                <Label>Type</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {credentialTypes.find(ct => ct.value === type)?.label || type}
                </div>
              </div>
            )}

            {/* Type-specific fields */}
            <div className="border-t pt-4">
              {renderTypeSpecificFields()}
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Type-specific form components

interface FormProps<T> {
  data: T;
  onChange: (field: string, value: unknown) => void;
}

function TelegramForm({ data, onChange }: FormProps<TelegramCredentialData>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="botToken">Bot Token</Label>
      <Input
        id="botToken"
        type="password"
        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
        value={data.botToken}
        onChange={(e) => onChange('botToken', e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Get your bot token from @BotFather on Telegram
      </p>
    </div>
  );
}

function SmtpForm({ data, onChange }: FormProps<SmtpCredentialData>) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="host">SMTP Host</Label>
          <Input
            id="host"
            placeholder="smtp.example.com"
            value={data.host}
            onChange={(e) => onChange('host', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            placeholder="587"
            value={data.port}
            onChange={(e) => onChange('port', parseInt(e.target.value) || 587)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtpUsername">Username</Label>
        <Input
          id="smtpUsername"
          placeholder="your@email.com"
          value={data.username}
          onChange={(e) => onChange('username', e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtpPassword">Password</Label>
        <Input
          id="smtpPassword"
          type="password"
          placeholder="Your password"
          value={data.password}
          onChange={(e) => onChange('password', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="secure"
          checked={data.secure ?? false}
          onCheckedChange={(checked) => onChange('secure', checked)}
        />
        <Label htmlFor="secure">Use TLS/SSL</Label>
      </div>
    </div>
  );
}

function HttpBasicForm({ data, onChange }: FormProps<HttpBasicCredentialData>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="basicUsername">Username</Label>
        <Input
          id="basicUsername"
          placeholder="username"
          value={data.username}
          onChange={(e) => onChange('username', e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="basicPassword">Password</Label>
        <Input
          id="basicPassword"
          type="password"
          placeholder="password"
          value={data.password}
          onChange={(e) => onChange('password', e.target.value)}
        />
      </div>
    </div>
  );
}

function HttpBearerForm({ data, onChange }: FormProps<HttpBearerCredentialData>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="bearerToken">Bearer Token</Label>
      <Input
        id="bearerToken"
        type="password"
        placeholder="eyJhbGciOiJIUzI1NiIs..."
        value={data.token}
        onChange={(e) => onChange('token', e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Will be sent as &quot;Authorization: Bearer &lt;token&gt;&quot; header
      </p>
    </div>
  );
}

function HttpApiKeyForm({ data, onChange }: FormProps<HttpApiKeyCredentialData>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="sk-..."
          value={data.apiKey}
          onChange={(e) => onChange('apiKey', e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="headerName">Header Name</Label>
        <Input
          id="headerName"
          placeholder="X-API-Key"
          value={data.headerName ?? 'X-API-Key'}
          onChange={(e) => onChange('headerName', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The HTTP header name where the API key will be sent
        </p>
      </div>
    </div>
  );
}

function DatabaseForm({ data, onChange }: FormProps<DatabaseCredentialData>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="connectionString">Connection String</Label>
      <Input
        id="connectionString"
        type="password"
        placeholder="postgresql://user:password@host:5432/database"
        value={data.connectionString}
        onChange={(e) => onChange('connectionString', e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        PostgreSQL connection string with credentials
      </p>
    </div>
  );
}

function ResendForm({ data, onChange }: FormProps<ResendCredentialData>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="resendApiKey">API Key</Label>
      <Input
        id="resendApiKey"
        type="password"
        placeholder="re_..."
        value={data.apiKey}
        onChange={(e) => onChange('apiKey', e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Get your API key from resend.com dashboard
      </p>
    </div>
  );
}

function AIForm({ data, onChange }: FormProps<AICredentialData>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="aiApiKey">API Key</Label>
        <Input
          id="aiApiKey"
          type="password"
          placeholder="sk-..."
          value={data.apiKey}
          onChange={(e) => onChange('apiKey', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Your OpenAI-compatible API key
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="baseUrl">Base URL (optional)</Label>
        <Input
          id="baseUrl"
          placeholder="https://api.openai.com/v1"
          value={data.baseUrl ?? ''}
          onChange={(e) => onChange('baseUrl', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for OpenAI. Use https://api.deepseek.com for DeepSeek.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="model">Model (optional)</Label>
        <Input
          id="model"
          placeholder="gpt-4o-mini"
          value={data.model ?? ''}
          onChange={(e) => onChange('model', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Default model to use. Can be overridden in each AI action.
        </p>
      </div>
    </div>
  );
}
