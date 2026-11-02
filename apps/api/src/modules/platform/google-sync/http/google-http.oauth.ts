import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import type { HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { GoogleEnv } from '@/config/env/env';
import type { GoogleOAuth } from '@/modules/platform/google-sync/google-client.port';
import { toGoogleError } from './google-http';

export function oauthClient(env: GoogleEnv): OAuth2Client {
  return new OAuth2Client({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    redirectUri: env.redirectUri,
    endpoints: { oauth2AuthBaseUrl: env.endpoints.auth, oauth2TokenUrl: env.endpoints.token, oauth2RevokeUrl: env.endpoints.revoke },
  });
}

/** Any string, as before (`z.email()` would turn odd strings into null). */
const userinfoSchema = z.looseObject({ email: z.string() });

/** A non-2xx or another shape: no email (null, as before); a network error or timeout throws. */
class NoEmail extends Error {}
const USERINFO_TIMEOUT_MS = 15_000;
const answered = (f: HttpFailure): boolean => f.kind === 'status' || f.kind === 'shape';
const noEmailOr = (f: HttpFailure): Error =>
  answered(f) ? new NoEmail() : new Error(`google userinfo: ${f.kind}`);

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
    const http = createHttp({
      name: 'google userinfo',
      base: () => this.env.endpoints.userinfo,
      headers: () => Promise.resolve({ authorization: `Bearer ${accessToken}` }),
      timeoutMs: USERINFO_TIMEOUT_MS,
      redirect: 'follow',
      errorBody: 'omit',
      errors: { default: noEmailOr },
    });
    try {
      return (await http.json({ path: '', schema: userinfoSchema })).email;
    } catch (e) {
      if (e instanceof NoEmail) return null;
      throw e;
    }
  }

  async revoke(refreshToken: string): Promise<void> {
    try {
      await oauthClient(this.env).revokeToken(refreshToken);
    } catch {
      // Best effort: the token is removed from Vault either way.
    }
  }
}
