import type { CodeSession, PasswordSession } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { DB, type Db } from '../../../../common/db/db.module';
import { badRequest } from '../../../../common/http/errors';
import { dbError } from '../../../../common/http/http';
import { SIGN_IN_CONFIG, type AuthGate, type SignInConfig } from '../sign-in.ports';

/** GoTrue's admin failures as module codes (a weak password is the user's to fix); anything else is a 500. */
function authError(error: { code?: string | undefined }): Error {
  if (error.code === 'weak_password') return badRequest('password_too_short');
  return new Error(`auth admin: ${error.code ?? 'unknown'}`);
}

/**
 * AuthGate on the service-role client's Admin API (no SMTP, no phone provider, no project setting).
 * signIn runs on a NEW isolated client per call (no stored or refreshed session), so the shared
 * service client never holds a user's session. Never logs a secret, a token or a password.
 */
@Injectable()
export class SupabaseAuthGate implements AuthGate {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SIGN_IN_CONFIG) private readonly config: SignInConfig,
  ) {}

  async idByEmail(email: string): Promise<string | null> {
    const { data, error } = await this.db.rpc('auth_user_id_by_email', { p_email: email });
    if (error) throw dbError(error);
    return data;
  }

  async emailOf(id: string): Promise<string | null> {
    const { data, error } = await this.db.auth.admin.getUserById(id);
    if (error) throw authError(error);
    return data.user.email ?? null;
  }

  async createUser(input: { email: string; password?: string; fullName: string }): Promise<string> {
    const { data, error } = await this.db.auth.admin.createUser({
      email: input.email,
      ...(input.password && { password: input.password }),
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error) throw authError(error);
    return data.user.id;
  }

  async removeUser(id: string): Promise<void> {
    const { error } = await this.db.auth.admin.deleteUser(id);
    if (error) throw authError(error);
  }

  async setPassword(id: string, password: string): Promise<void> {
    const { error } = await this.db.auth.admin.updateUserById(id, { password });
    if (error) throw authError(error);
  }

  async revokeSessions(id: string): Promise<void> {
    const { error } = await this.db.rpc('revoke_user_sessions', { p_user: id });
    if (error) throw dbError(error);
  }

  /** Only the hashed token leaves: the client trades it with verifyOtp (the action link is never returned). */
  async magicLink(email: string): Promise<CodeSession> {
    const { data, error } = await this.db.auth.admin.generateLink({ type: 'magiclink', email });
    if (error) throw authError(error);
    return { token_hash: data.properties.hashed_token, type: 'magiclink' };
  }

  async signIn(input: { email: string; password: string }): Promise<PasswordSession | null> {
    const client = createClient(this.config.supabaseUrl, this.config.signInKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.session) return null;
    const { access_token, refresh_token, expires_in, expires_at } = data.session;
    return { access_token, refresh_token, expires_in, expires_at: expires_at ?? null };
  }
}
