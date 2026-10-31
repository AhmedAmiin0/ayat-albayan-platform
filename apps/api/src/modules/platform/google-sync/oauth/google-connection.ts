import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { TtlCache } from '@/common/infra/cache/ttl-cache';
import { SETTINGS_CACHE_MS } from '@/common/configuration/config-store/config-store.types';
import { GoogleAccountQueries } from './google-account.queries';
import { GoogleAlerts } from '@/modules/platform/google-sync/google-alerts';
import { GOOGLE_CLIENT_FACTORY, type GoogleClient, type GoogleClientFactory } from '@/modules/platform/google-sync/google-client.port';

/** How long the account status + refresh token are reused before Vault is asked again. */
const CONNECTION_TTL_MS = 10 * 60_000;

/**
 * The connected account's client: the refresh token is read from Vault when needed and kept only
 * in memory (one client per token, so google-auth-library reuses its access token until it expires).
 * The status + token read is reused for CONNECTION_TTL_MS (two round trips a job tick before; never
 * when SETTINGS_CACHE_MS is 0, as in e2e, whose reset writes SQL); every connect, disconnect and
 * refused token calls forget() after its writes, so this API never keeps a stale one. An
 * invalid_grant (revoked or expired consent) disconnects: token cleared, status `disconnected`,
 * one bell alert to the admins — never a crash loop.
 */
@Injectable()
export class GoogleConnection {
  private readonly log = new Logger(GoogleConnection.name);
  private cached: { token: string; client: GoogleClient } | null = null;
  /** Property-injected (the constructor is at the 3-parameter limit); 0 = no reuse. */
  @Optional() @Inject(SETTINGS_CACHE_MS) private readonly settingsTtlMs?: number;
  private readonly token = new TtlCache(() => (this.settingsTtlMs === 0 ? 0 : CONNECTION_TTL_MS), () => this.connectedToken());

  constructor(
    private readonly account: GoogleAccountQueries,
    @Inject(GOOGLE_CLIENT_FACTORY) private readonly factory: GoogleClientFactory,
    private readonly alerts: GoogleAlerts,
  ) {}

  /** null when not connected or the OAuth client is not configured. */
  async client(): Promise<GoogleClient | null> {
    const token = await this.token.get();
    if (!token || !this.factory.oauth()) return null;
    if (this.cached?.token !== token) this.cached = { token, client: this.factory.client(token) };
    return this.cached.client;
  }

  forget(): void {
    this.cached = null;
    this.token.clear();
  }

  /** The Vault token while the account is connected; null otherwise. Never logged. */
  private async connectedToken(): Promise<string | null> {
    const acct = await this.account.get();
    return acct.status === 'connected' ? this.account.token() : null;
  }

  /** The OAuth client itself is refused (invalid_client): the token stays, the admin fixes the client id/secret. */
  async configFailed(): Promise<void> {
    this.forget();
    this.log.warn('google oauth client refused (invalid_client): sync paused, refresh token kept');
    await this.account.update({ last_error: 'invalid_client' });
  }

  async authFailed(): Promise<void> {
    this.forget();
    this.log.warn('google refresh token refused (invalid_grant): disconnected');
    await this.account.clearToken();
    await this.account.update({ status: 'disconnected', last_error: 'invalid_grant' });
    // Again after the writes: a client() call in between must not keep the refused token.
    this.forget();
    await this.alerts.disconnected();
  }
}
