import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { withoutPushToken, withPushToken } from './push-tokens';

/**
 * The signed-in user's own profile settings. Push tokens (R-MOB-01) live on profiles.push_tokens.
 * ponytail: read-then-write (supabase-js has no atomic array_append); two devices registering in
 * the same instant can drop one, and that device re-registers on its next start. Upgrade: an RPC.
 */
@Injectable()
export class MeService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async addPushToken(userId: string, token: string): Promise<void> {
    const tokens = await this.pushTokens(userId);
    const next = withPushToken(tokens, token);
    if (next !== tokens) await this.savePushTokens(userId, next);
    await this.releaseFromOthers(userId, token);
  }

  async removePushToken(userId: string, token: string): Promise<void> {
    const tokens = await this.pushTokens(userId);
    const next = withoutPushToken(tokens, token);
    if (next !== tokens) await this.savePushTokens(userId, next);
  }

  private async pushTokens(userId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('push_tokens')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw new NotFoundException();
    return data.push_tokens;
  }

  /**
   * A device belongs to whoever signed in on it last: a handed-over phone, or one whose sign-out
   * DELETE never ran (401, offline, timeout), stops receiving the previous admin's pushes.
   */
  private async releaseFromOthers(userId: string, token: string): Promise<void> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, push_tokens')
      .contains('push_tokens', [token])
      .neq('id', userId);
    if (error) throw dbError(error);
    for (const p of data ?? []) await this.savePushTokens(p.id, withoutPushToken(p.push_tokens, token));
  }

  private async savePushTokens(userId: string, tokens: string[]): Promise<void> {
    const { error } = await this.db.from('profiles').update({ push_tokens: tokens }).eq('id', userId);
    if (error) throw dbError(error);
  }
}
