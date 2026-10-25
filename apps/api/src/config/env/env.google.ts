import { GOOGLE_REDIRECT_URI_PRODUCTION } from '@ab/shared';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret, optionalUrl } from './env.blank';

/**
 * Google sync (docs/24). The OAuth client (id plain, secret in Vault) comes from «التكاملات» or env.
 * GOOGLE_API_BASE and GOOGLE_REDIRECT_URI stay env only: local and e2e point the base at
 * tools/google-stub and the callback at their own API, so no test ever reaches Google.
 */
export const GOOGLE_SHAPE = {
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  /** One base for every Google endpoint (OAuth, Calendar, Drive, Sheets): the stub. Unset = Google. */
  GOOGLE_API_BASE: optionalUrl,
  /** The OAuth callback of this API. Unset = https://api.ayatalbayan.com/integrations/google/callback. */
  GOOGLE_REDIRECT_URI: optionalUrl,
  /** The outbox worker's tick in ms (default 60 s); e2e sets ~1 s. */
  GOOGLE_SYNC_POLL_MS: z.preprocess(blankIsUnset, z.coerce.number().int().min(200).optional()),
};

/** Where each Google API lives: Google's hosts, or all under one stub base. */
export interface GoogleEndpoints {
  auth: string;
  token: string;
  revoke: string;
  userinfo: string;
  /** Calendar v3, Drive v3 (metadata) */
  api: string;
  /** Drive v3 media uploads */
  upload: string;
  sheets: string;
}

export interface GoogleEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  endpoints: GoogleEndpoints;
}

export function googleEndpoints(base: string | undefined): GoogleEndpoints {
  if (!base) {
    return {
      auth: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      revoke: 'https://oauth2.googleapis.com/revoke',
      userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
      api: 'https://www.googleapis.com',
      upload: 'https://www.googleapis.com/upload',
      sheets: 'https://sheets.googleapis.com',
    };
  }
  const b = base.replace(/\/+$/, '');
  return {
    auth: `${b}/o/oauth2/v2/auth`,
    token: `${b}/token`,
    revoke: `${b}/revoke`,
    userinfo: `${b}/v1/userinfo`,
    api: b,
    upload: `${b}/upload`,
    sheets: b,
  };
}

export const googleRedirectUri = (env: Env): string => env.GOOGLE_REDIRECT_URI ?? GOOGLE_REDIRECT_URI_PRODUCTION;

/** null until both the client id and secret are set (the connect button stays disabled). */
export function googleEnv(env: Env): GoogleEnv | null {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = env;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: googleRedirectUri(env), endpoints: googleEndpoints(env.GOOGLE_API_BASE) };
}
