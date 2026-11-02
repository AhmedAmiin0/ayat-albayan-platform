import { isWaAuthError } from '@ab/shared';
import { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { FetchLike, HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';
import type { GraphEnv } from '@/config/env/env';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The Graph API profiles (docs/36 h8, docs/12 §3.2): auth by driver, JSON, one deadline per call,
// and Meta's error body → WaError as a table. Redirects are followed, as before.

export type { FetchLike };

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

const metaErrorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    code: z.number().optional(),
    error_user_msg: z.string().optional(),
    error_data: z.object({ details: z.string().optional() }).optional(),
  }),
});

type Status = Extract<HttpFailure, { kind: 'status' }>;

/** Only a status failure reaches the table's default (every other kind has its own entry). */
const NO_STATUS = { status: 0, body: null, text: '' };
const statusOf = (f: HttpFailure): Pick<Status, 'status' | 'body' | 'text'> =>
  f.kind === 'status' ? f : NO_STATUS;

/** Meta's `{ error: { code, message, error_data.details } }`; anything else keeps code null. */
function waErrorFrom(f: HttpFailure): WaError {
  const { status, body, text } = statusOf(f);
  const meta = metaErrorSchema.safeParse(body);
  const fallback = `WhatsApp HTTP ${status}`;
  if (!meta.success) {
    return new WaError(fallback, { code: null, status, details: text || undefined });
  }
  const e = meta.data.error;
  const details = e.error_data?.details ?? e.error_user_msg;
  return new WaError(e.message ?? fallback, { code: e.code ?? null, status, details });
}

const KEY_REFUSED = new Set([401, 403]);

/** Kapso's own refusal: 401 / 403, no Meta auth code, and no Meta code that differs from it. */
function kapsoRefused(env: GraphEnv, info: WaError['info']): boolean {
  const kapsoKey = env.provider === 'kapso' && KEY_REFUSED.has(info.status);
  const ownCode = info.code === null || info.code === info.status;
  return kapsoKey && ownCode && !isWaAuthError(info.code);
}

/**
 * Kapso refusing its project key (HTTP 401 / 403 with no Meta code of its own) is a broken
 * credential: tagged `credential: 'kapso'` (never Meta's 190, whose words point at Business
 * Manager), so the sender holds the line's queue instead of failing every row and the admin is
 * told to fix KAPSO_API_KEY. Meta's own errors pass through unchanged.
 */
export function byDriver(env: GraphEnv, error: WaError): WaError {
  if (!kapsoRefused(env, error.info)) return error;
  const info = { ...error.info, credential: 'kapso' as const };
  return new WaError(`Kapso refused the API key: ${error.message}`, info);
}

/** A 2xx whose body is not what the call expects: Meta answered, but not as expected. */
const shapeError = (f: HttpFailure): WaError => {
  const issues = f.kind === 'shape' ? f.issues : [];
  const details = new z.ZodError(issues).message.slice(0, 300);
  return new WaError('Unexpected WhatsApp response', { code: null, status: 200, details });
};

/** No credential involved: the table of every Graph call, and all of the download_url's. */
const PLAIN: ErrorTable<WaError> = {
  network: (f) =>
    new WaError('WhatsApp request failed', {
      code: null,
      status: 0,
      uncertain: f.kind === 'network' && f.reached,
    }),
  timeout: () =>
    new WaError('WhatsApp request timed out', { code: null, status: 0, uncertain: true }),
  shape: shapeError,
  default: waErrorFrom,
};

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
  errors: ErrorTable<WaError>;
}

function profileHttp(conn: GraphConn, p: Profile): Http {
  return createHttp({
    name: p.name,
    base: () => `${conn.env.base}/${conn.env.version}`,
    headers: () => Promise.resolve(p.headers),
    timeoutMs: conn.timeoutMs,
    redirect: 'follow',
    errorBody: metaErrorSchema,
    errors: p.errors,
    fetch: conn.fetch,
  });
}

/** Every Graph call of a line: its credential, its driver's 401 / 403 entries. */
export function graphHttp(conn: GraphConn): Http {
  const name = providerOf(conn.env);
  const errors = { ...PLAIN, ...KEY_ENTRIES[name](conn.env) };
  return profileHttp(conn, { name, headers: authHeaders(conn.env), errors });
}

/**
 * Kapso's download_url carries its own token: NO credential at all (never send ours there), and
 * the plain table, so a 401 there is never `credential: 'kapso'` (the line is never held).
 */
export function graphDownload(conn: GraphConn): Http {
  return profileHttp(conn, { name: `${providerOf(conn.env)} download`, headers: {}, errors: PLAIN });
}
