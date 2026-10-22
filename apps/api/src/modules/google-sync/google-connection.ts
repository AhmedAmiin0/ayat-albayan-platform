import { Inject, Injectable, Logger } from '@nestjs/common';
import { GoogleAccountQueries } from './google-account.queries';
import { GoogleAlerts } from './google-alerts';
import { GOOGLE_CLIENT_FACTORY, type GoogleClient, type GoogleClientFactory } from './google-client.port';

/**
 * The connected account's client: the refresh token is read from Vault when needed and kept only
 * in memory (one client per token, so google-auth-library reuses its access token). An
 * invalid_grant (revoked or expired consent) disconnects: token cleared, status `disconnected`,
 * one bell alert to the admins — never a crash loop.
 */
@Injectable()
export class GoogleConnection {
  private readonly log = new Logger(GoogleConnection.name);
  private cached: { token: string; client: GoogleClient } | null = null;

  constructor(
    private readonly account: GoogleAccountQueries,
    @Inject(GOOGLE_CLIENT_FACTORY) private readonly factory: GoogleClientFactory,
    private readonly alerts: GoogleAlerts,
  ) {}

  /** null when not connected or the OAuth client is not configured. */
  async client(): Promise<GoogleClient | null> {
    const acct = await this.account.get();
    if (acct.status !== 'connected') return null;
    const token = await this.account.token();
    if (!token || !this.factory.oauth()) return null;
    if (this.cached?.token !== token) this.cached = { token, client: this.factory.client(token) };
    return this.cached.client;
  }

  forget(): void {
    this.cached = null;
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
    await this.alerts.disconnected();
  }
}
