import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseService } from './supabase.service';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  providers: [
    SupabaseService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [SupabaseService],
})
export class AuthModule {}
