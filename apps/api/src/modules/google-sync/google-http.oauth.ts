import { OAuth2Client } from 'google-auth-library';
import type { GoogleEnv } from '../../env';
import type { GoogleOAuth } from './google-client.port';
import { toGoogleError } from './google-http';

export function oauthClient(env: GoogleEnv): OAuth2Client {
  return new OAuth2Client({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    redirectUri: env.redirectUri,
    endpoints: { oauth2AuthBaseUrl: env.endpoints.auth, oauth2TokenUrl: env.endpoints.token, oauth2RevokeUrl: env.endpoints.revoke },
  });
}

/** The consent URL (offline, consent prompt), the code exchange, the account's email, the revoke. */
export class GoogleOAuthApi implements GoogleOAuth {
  constructor(private readonly env: GoogleEnv) {}

  authUrl(input: { state: string; scopes: readonly string[] }): string {
    return oauthClient(this.env).generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: false,
      scope: [...input.scopes],
      state: input.state,
    });
  }

  async exchange(code: string): Promise<{ refreshToken: string | null; scopes: string[]; accessToken: string }> {
    try {
      const { tokens } = await oauthClient(this.env).getToken(code);
      return { refreshToken: tokens.refresh_token ?? null, scopes: (tokens.scope ?? '').split(/\s+/).filter(Boolean), accessToken: tokens.access_token ?? '' };
    } catch (e) {
      throw toGoogleError(e);
    }
  }

  async email(accessToken: string): Promise<string | null> {
    const res = await fetch(this.env.endpoints.userinfo, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { email?: unknown };
    return typeof body.email === 'string' ? body.email : null;
  }

  async revoke(refreshToken: string): Promise<void> {
    try {
      await oauthClient(this.env).revokeToken(refreshToken);
    } catch {
      // Best effort: the token is removed from Vault either way.
    }
  }
}
