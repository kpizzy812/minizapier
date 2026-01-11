'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Key,
  MoreVertical,
  Trash2,
  Edit,
  TestTube,
  Plus,
  Bot,
  Mail,
  Database,
  Globe,
  KeyRound,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCredentials,
  useDeleteCredential,
  useTestCredential,
} from '@/hooks/use-credentials';
import { Credential, CredentialType } from '@/lib/api';
import { CredentialDialog } from './credential-dialog';

// Credential type display info
const credentialTypeInfo: Record<
  CredentialType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  TELEGRAM: { label: 'Telegram Bot', icon: Bot, color: 'bg-blue-500' },
  SMTP: { label: 'SMTP Server', icon: Mail, color: 'bg-orange-500' },
  HTTP_BASIC: { label: 'HTTP Basic Auth', icon: Globe, color: 'bg-green-500' },
  HTTP_BEARER: { label: 'HTTP Bearer Token', icon: KeyRound, color: 'bg-purple-500' },
  HTTP_API_KEY: { label: 'API Key', icon: Key, color: 'bg-yellow-500' },
  DATABASE: { label: 'Database', icon: Database, color: 'bg-red-500' },
  RESEND: { label: 'Resend Email', icon: Send, color: 'bg-pink-500' },
};

export function CredentialList() {
  const { data: credentials, isLoading, error } = useCredentials();
  const deleteCredential = useDeleteCredential();
  const testCredential = useTestCredential();

  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [editCredential, setEditCredential] = useState<Credential | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState<CredentialType | 'ALL'>('ALL');
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      await deleteCredential.mutateAsync(deleteDialog.id);
      toast.success('Credential deleted');
    } catch {
      toast.error('Failed to delete credential');
    } finally {
      setDeleteDialog(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testCredential.mutateAsync(id);
      if (result.success) {
        toast.success(result.message || 'Connection successful');
      } else {
        toast.error(result.message || 'Connection failed');
      }
    } catch {
      toast.error('Failed to test credential');
    } finally {
      setTestingId(null);
    }
  };

  // Filter credentials by type
  const filteredCredentials = credentials?.filter(
    (cred) => filterType === 'ALL' || cred.type === filterType
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading credentials...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-destructive">Unable to load credentials</CardTitle>
          <CardDescription>
            Please check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Header with filter and create button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select
            value={filterType}
            onValueChange={(value) => setFilterType(value as CredentialType | 'ALL')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {Object.entries(credentialTypeInfo).map(([type, info]) => (
                <SelectItem key={type} value={type}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Credential
        </Button>
      </div>

      {/* Empty state */}
      {!filteredCredentials || filteredCredentials.length === 0 ? (
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>
              {filterType === 'ALL' ? 'No credentials yet' : 'No credentials found'}
            </CardTitle>
            <CardDescription>
              {filterType === 'ALL'
                ? 'Add your first credential to connect external services'
                : 'No credentials match the selected filter'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateOpen(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Credentials grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCredentials.map((credential) => {
            const typeInfo = credentialTypeInfo[credential.type];
            const IconComponent = typeInfo.icon;
            const isTesting = testingId === credential.id;

            return (
              <Card key={credential.id} className="group relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeInfo.color}`}
                      >
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1 text-base">
                          {credential.name}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {typeInfo.label}
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Credential actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleTest(credential.id)}
                          disabled={isTesting}
                        >
                          <TestTube className="mr-2 h-4 w-4" />
                          {isTesting ? 'Testing...' : 'Test Connection'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditCredential(credential)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({ id: credential.id, name: credential.name })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created{' '}
                    {formatDistanceToNow(new Date(credential.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CredentialDialog
        open={isCreateOpen || !!editCredential}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditCredential(null);
          }
        }}
        credential={editCredential}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credential?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.name}&quot;? This
              action cannot be undone. Workflows using this credential will stop
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
