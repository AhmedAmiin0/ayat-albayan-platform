import type { Json } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';

export type AccountRow = {
  status: 'disconnected' | 'connected' | 'error';
  email: string | null;
  scopes: string[];
  connected_at: string | null;
  connected_by: string | null;
  last_error: string | null;
  discovery: Json | null;
  root_folder_id: string | null;
  root_folder_name: string | null;
  summary_sheet_id: string | null;
  drive_confirmed_at: string | null;
  last_run_at: string | null;
};
export type AccountPatch = Partial<AccountRow> & { drive_confirmed_by?: string | null };

const COLUMNS =
  'status, email, scopes, connected_at, connected_by, last_error, discovery, root_folder_id, root_folder_name, summary_sheet_id, drive_confirmed_at, last_run_at';

const fail = (what: string, error: { message: string }) => new Error(`google ${what} failed: ${error.message}`);

/** google_account (one row) and the refresh token's Vault functions, with the service role. Never logs a value. */
@Injectable()
export class GoogleAccountQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get(): Promise<AccountRow> {
    const { data, error } = await this.db.from('google_account').select(COLUMNS).eq('id', true).maybeSingle();
    if (error) throw fail('account read', error);
    return (data ?? { status: 'disconnected', email: null, scopes: [], connected_at: null, connected_by: null, last_error: null, discovery: null,
      root_folder_id: null, root_folder_name: null, summary_sheet_id: null, drive_confirmed_at: null, last_run_at: null }) as AccountRow;
  }

  async update(patch: AccountPatch): Promise<void> {
    const { error } = await this.db.from('google_account').upsert({ id: true, ...patch });
    if (error) throw fail('account write', error);
  }

  /** The pending OAuth round trip: only the nonce's hash, with its expiry. */
  async setNonce(input: { hash: string; expiresAt: Date }): Promise<void> {
    await this.update({});
    const { error } = await this.db
      .from('google_account')
      .update({ oauth_nonce_hash: input.hash, oauth_nonce_expires_at: input.expiresAt.toISOString() })
      .eq('id', true);
    if (error) throw fail('nonce write', error);
  }

  /** Single use: true only for the current, unexpired nonce, which is cleared in the same statement. */
  async consumeNonce(hash: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('google_account')
      .update({ oauth_nonce_hash: null, oauth_nonce_expires_at: null })
      .eq('id', true)
      .eq('oauth_nonce_hash', hash)
      .gt('oauth_nonce_expires_at', new Date().toISOString())
      .select('status');
    if (error) throw fail('nonce check', error);
    return data.length === 1;
  }

  async setToken(value: string): Promise<void> {
    const { error } = await this.db.rpc('google_token_set', { p_value: value });
    if (error) throw fail('token write', error);
  }

  async token(): Promise<string | null> {
    const { data, error } = await this.db.rpc('google_token_read');
    if (error) throw fail('token read', error);
    return typeof data === 'string' && data !== '' ? data : null;
  }

  async clearToken(): Promise<void> {
    const { error } = await this.db.rpc('google_token_clear');
    if (error) throw fail('token clear', error);
  }
}
