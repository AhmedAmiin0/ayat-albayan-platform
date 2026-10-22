import { GOOGLE_SCOPES } from '@ab/shared';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '../../env';
import { GoogleAccountQueries } from './google-account.queries';
import { GOOGLE_CLIENT_FACTORY, type GoogleClientFactory } from './google-client.port';
import { GoogleData } from './google-data';
import { GoogleRuntime } from './google-runtime';
import { newState, nonceHash, readState, stateKey } from './oauth-state';

/** The callback's outcome, shown by the web as a toast (?google=connected | ?google=error&reason=…). */
export type CallbackOutcome = 'connected' | 'denied' | 'state' | 'exchange' | 'scopes' | 'not_configured' | 'account';
export const GOOGLE_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

/** Every https scope must be granted (the openid/email pair comes back as userinfo.email). */
export const REQUIRED_SCOPES = GOOGLE_SCOPES.filter((s) => s.startsWith('https://'));

/**
 * The owner connects the academy's Google account once (docs/24 «Owner answers» 4): consent URL with
 * a signed, single-use state; the callback exchanges the code and keeps the refresh token in Vault
 * only. Tokens are never returned, logged or audited.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly log = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly data: GoogleData,
    @Inject(GOOGLE_CLIENT_FACTORY) private readonly factory: GoogleClientFactory,
    private readonly run: GoogleRuntime,
  ) {}

  private get account(): GoogleAccountQueries {
    return this.data.account;
  }

  private key(): Buffer {
    return stateKey(loadEnv().SUPABASE_SERVICE_ROLE_KEY);
  }

  async connectUrl(userId: string, now = Date.now()): Promise<string> {
    const oauth = this.factory.oauth();
    if (!oauth) throw new ConflictException({ message: 'not_configured' });
    const s = newState({ userId, key: this.key(), now });
    await this.account.setNonce({ hash: nonceHash(s.nonce), expiresAt: s.expiresAt });
    return oauth.authUrl({ state: s.state, scopes: GOOGLE_SCOPES });
  }

  async callback(input: { code?: string; state?: string; error?: string }): Promise<CallbackOutcome> {
    if (input.error || !input.code) return 'denied';
    const payload = input.state ? readState({ state: input.state, key: this.key(), now: Date.now() }) : null;
    if (!payload || !(await this.account.consumeNonce(nonceHash(payload.n)))) return 'state';
    const oauth = this.factory.oauth();
    if (!oauth) return 'not_configured';
    let tokens: Awaited<ReturnType<typeof oauth.exchange>>;
    try {
      tokens = await oauth.exchange(input.code);
    } catch (e) {
      this.log.warn(`google code exchange failed: ${e instanceof Error ? e.message : 'error'}`);
      return 'exchange';
    }
    if (!tokens.refreshToken) return 'exchange';
    if (!REQUIRED_SCOPES.every((s) => tokens.scopes.includes(s))) return 'scopes';
    const email = await oauth.email(tokens.accessToken).catch(() => null);
    // Another Google account would turn every recorded id into «gone»: only the academy's account (once connected).
    const before = (await this.account.get()).email;
    if (before && email !== before) return 'account';
    await this.account.setToken(tokens.refreshToken);
    await this.account.update({ status: 'connected', email, scopes: tokens.scopes, connected_at: new Date().toISOString(), connected_by: payload.u, last_error: null });
    this.run.connection.forget();
    await this.run.audit.record({ actorId: payload.u, entity: 'google_account', entityId: GOOGLE_ENTITY_ID, action: 'connect', before: null, after: { email } });
    return 'connected';
  }

  async disconnect(userId: string): Promise<void> {
    const token = await this.account.token();
    if (token) await this.factory.oauth()?.revoke(token);
    await this.account.clearToken();
    await this.account.update({ status: 'disconnected', last_error: null });
    this.run.connection.forget();
    await this.run.audit.record({ actorId: userId, entity: 'google_account', entityId: GOOGLE_ENTITY_ID, action: 'disconnect', before: null, after: null });
  }
}
