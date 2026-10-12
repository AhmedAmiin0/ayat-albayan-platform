import { createClient } from '@supabase/supabase-js';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { badRequest, conflict } from '../scheduling/errors';
import { ACCOUNT_CONFIG, type AccountAuth, type AccountConfig } from './account.ports';

interface AuthFailure {
  code?: string | undefined;
  message: string;
}

function authError(error: AuthFailure): Error {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return conflict('email_taken');
  if (error.code === 'weak_password') return badRequest('password_too_short');
  if (error.code === 'validation_failed') return badRequest('invalid_email');
  return new Error(`auth admin: ${error.code ?? 'unknown'}`);
}

/**
 * AccountAuth: reads and updates go through the service-role client's Admin API (no SMTP: an email
 * change is confirmed at once). The current password is checked on a NEW, isolated client per call
 * (no stored or refreshed session), so the shared service client never takes a user's session.
 */
@Injectable()
export class SupabaseAccountAuth implements AccountAuth {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ACCOUNT_CONFIG) private readonly config: AccountConfig,
  ) {}

  async emailOf(id: string): Promise<string | null> {
    const { data, error } = await this.db.auth.admin.getUserById(id);
    if (error) throw authError(error);
    return data.user.email ?? null;
  }

  async passwordMatches(input: { email: string; password: string }): Promise<boolean> {
    const client = createClient(this.config.supabaseUrl, this.config.signInKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.session) return false;
    // The check opened a session of its own: end just that one, the user's devices stay signed in.
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    return true;
  }

  async update(id: string, patch: { email?: string; password?: string }): Promise<void> {
    const { error } = await this.db.auth.admin.updateUserById(id, {
      ...(patch.email && { email: patch.email, email_confirm: true }),
      ...(patch.password && { password: patch.password }),
    });
    if (error) throw authError(error);
  }
}
