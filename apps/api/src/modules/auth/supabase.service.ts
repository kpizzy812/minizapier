import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  User,
  SupabaseClientOptions,
} from '@supabase/supabase-js';

type GenericSchema = Record<string, unknown>;

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient<GenericSchema>;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined',
      );
    }

    const options: SupabaseClientOptions<'public'> = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    };

    this.supabase = createClient<GenericSchema>(
      supabaseUrl,
      supabaseServiceKey,
      options,
    );
  }

  async getUserFromToken(accessToken: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);

      if (error) {
        return null;
      }

      return data.user;
    } catch {
      return null;
    }
  }

  getClient(): SupabaseClient<GenericSchema> {
    return this.supabase;
  }
}
