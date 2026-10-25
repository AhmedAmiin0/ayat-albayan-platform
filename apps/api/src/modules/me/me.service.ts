import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { claimDevice, type DeviceClaim } from './push-device.claim';
import { withoutPushToken, withPushToken } from './push-tokens';

/**
 * The signed-in user's own profile settings. Push tokens (R-MOB-01) live on profiles.push_tokens,
 * each bound to the auth session that registered it (push_device_sessions, migration 700): that
 * session's end removes the token server-side, and only bound tokens of a live session get a push.
 * A token bound to another person's live session is never taken over on the token alone: the
 * request must carry that binding's device key (claimDevice: migration 730's one locked statement).
 * ponytail: read-then-write (supabase-js has no atomic array_append); two devices registering in
 * the same instant can drop one, and that device re-registers on its next start. Upgrade: an RPC.
 */
@Injectable()
export class MeService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * 401 without a session to bind to (a token with no session_id claim, or a session just ended);
   * 409 when the token is someone else's live device. Returns the key the device keeps for next time.
   */
  async addPushToken(input: DeviceClaim & { sessionId: string | null }): Promise<{ deviceKey: string }> {
    const { userId, token, sessionId } = input;
    if (!sessionId) throw new UnauthorizedException('no_session');
    const deviceKey = await claimDevice(this.db, { ...input, sessionId });
    const tokens = await this.pushTokens(userId);
    const next = withPushToken(tokens, token);
    if (next !== tokens) await this.savePushTokens(userId, next);
    await this.releaseFromOthers(userId, token);
    return { deviceKey };
  }

  async removePushToken(userId: string, token: string): Promise<void> {
    const tokens = await this.pushTokens(userId);
    const next = withoutPushToken(tokens, token);
    if (next !== tokens) await this.savePushTokens(userId, next);
    const { error } = await this.db.from('push_device_sessions').delete().eq('token', token).eq('profile_id', userId);
    if (error) throw dbError(error);
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
   * A device belongs to whoever signed in on it last (once claimDevice let it move): a handed-over phone, or one whose sign-out
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
