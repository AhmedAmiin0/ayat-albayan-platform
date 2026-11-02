import type { ErrorTable } from '@/common/infra/http/errors';
import type { FetchLike, HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';
import type { GraphEnv } from '@/config/env/env';
import type { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { byDriver, metaErrorSchema, PLAIN, SENT_SHAPE, waErrorFrom } from './graph-errors';

// The Graph API profiles (docs/36 h8, h8b, docs/12 §3.2): auth by driver, JSON, one deadline per
// call, and Meta's error body → WaError as a table (graph-errors.ts).

export type { FetchLike };
export { byDriver };

type Provider = NonNullable<GraphEnv['provider']>;

/** provider absent = meta (MetaLineEnv's shape, unchanged). */
export const providerOf = (env: GraphEnv): Provider => env.provider ?? 'meta';

export interface GraphConn {
  env: GraphEnv;
  fetch: FetchLike;
  timeoutMs: number;
}

/** The credential by driver (docs/19): Meta's bearer token, or Kapso's project key (never a bearer). */
export function authHeaders(env: GraphEnv): Record<string, string> {
  return env.provider === 'kapso'
    ? { 'x-api-key': env.apiKey }
    : { authorization: `Bearer ${env.accessToken}` };
}

type Redirect = NonNullable<RequestInit['redirect']>;

/**
 * docs/36 h8b (2): a keyed Kapso call never follows a redirect (undici strips `Authorization` on
 * a cross-origin redirect but keeps `x-api-key`); a 3xx fails as a network error. Meta follows.
 */
const KEYED_REDIRECT = { kapso: 'error', meta: 'follow' } satisfies Record<Provider, Redirect>;

type KeyEntries = (env: GraphEnv) => Partial<ErrorTable<WaError>>;

/** Only a request that carried the key can have the key refused: byDriver on 401 / 403. */
const refusedKey: KeyEntries = (env) => {
  const refused = (f: HttpFailure): WaError => byDriver(env, waErrorFrom(f));
  return { 401: refused, 403: refused };
};

const KEY_ENTRIES = {
  kapso: refusedKey,
  meta: () => ({}),
} satisfies Record<Provider, KeyEntries>;

interface Profile {
  name: string;
  headers: Record<string, string>;
  redirect: Redirect;
  errors: ErrorTable<WaError>;
}

function profileHttp(conn: GraphConn, p: Profile): Http {
  return createHttp({
    name: p.name,
    base: () => `${conn.env.base}/${conn.env.version}`,
    headers: () => Promise.resolve(p.headers),
    timeoutMs: conn.timeoutMs,
    redirect: p.redirect,
    errorBody: metaErrorSchema,
    errors: p.errors,
    fetch: conn.fetch,
  });
}

/** A keyed profile of the line: its credential, its driver's redirect and 401 / 403 entries. */
function keyedHttp(conn: GraphConn, extra: Partial<ErrorTable<WaError>>): Http {
  const name = providerOf(conn.env);
  const errors = { ...PLAIN, ...KEY_ENTRIES[name](conn.env), ...extra };
  const redirect = KEYED_REDIRECT[name];
  return profileHttp(conn, { name, headers: authHeaders(conn.env), redirect, errors });
}

/** Every Graph call of a line but the message send. */
export function graphHttp(conn: GraphConn): Http {
  return keyedHttp(conn, {});
}

/** `POST {phone}/messages` only: a 2xx without a message id is `uncertain` (h8b). */
export function graphSend(conn: GraphConn): Http {
  return keyedHttp(conn, SENT_SHAPE);
}

/**
 * Kapso's download_url carries its own token: NO credential at all (never send ours there), and
 * the plain table, so a 401 there is never `credential: 'kapso'` (the line is never held).
 * Redirects are followed: it carries no header worth keeping.
 */
export function graphDownload(conn: GraphConn): Http {
  const name = `${providerOf(conn.env)} download`;
  return profileHttp(conn, { name, headers: {}, redirect: 'follow', errors: PLAIN });
}
