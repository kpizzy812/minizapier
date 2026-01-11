import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  emailConfirmedAt?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
}

export function mapSupabaseUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    emailConfirmedAt: user.email_confirmed_at,
    phone: user.phone,
    createdAt: user.created_at,
    updatedAt: user.updated_at || user.created_at,
    userMetadata: user.user_metadata,
    appMetadata: user.app_metadata,
  };
}
