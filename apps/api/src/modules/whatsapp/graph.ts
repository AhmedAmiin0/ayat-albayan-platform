import { isWaAuthError } from '@ab/shared';
import { z } from 'zod';
import type { WhatsappEnv } from '../../env';
import { WaError } from './whatsapp.types';

// One Graph API call: auth by provider, JSON, timeout, and Meta's error body → WaError (docs/12 §3.2).

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface GraphConn {
  env: WhatsappEnv;
  fetch: FetchLike;
  timeoutMs: number;
}

export interface GraphRequest {
  /** Relative to {base}/{version}/, or an absolute URL (Meta's media download link). */
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Raw bytes instead of a JSON body (the resumable upload). */
  raw?: Uint8Array<ArrayBuffer>;
  /** Override or add headers (the upload's `authorization: OAuth …` and `file_offset`). */
  headers?: Record<string, string>;
  /** false = no credential at all (Kapso's download_url carries its own token: never send ours there). */
  auth?: false;
}

/** The credential by driver (docs/19): Meta's bearer token, or Kapso's project key (never a bearer). */
export function authHeaders(env: WhatsappEnv): Record<string, string> {
  return env.provider === 'kapso' ? { 'x-api-key': env.apiKey } : { authorization: `Bearer ${env.accessToken}` };
}

const metaErrorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    code: z.number().optional(),
    error_user_msg: z.string().optional(),
    error_data: z.object({ details: z.string().optional() }).optional(),
  }),
});

function url(env: WhatsappEnv, path: string): string {
  return /^https?:\/\//.test(path) ? path : `${env.base}/${env.version}/${path}`;
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Meta's `{ error: { code, message, error_data.details } }`; anything else keeps code null. */
export function waErrorFrom(status: number, text: string): WaError {
  const r = metaErrorSchema.safeParse(parse(text));
  if (!r.success) {
    return new WaError(`WhatsApp HTTP ${status}`, { code: null, status, details: text.slice(0, 300) || undefined });
  }
  const e = r.data.error;
  const details = e.error_data?.details ?? e.error_user_msg;
  return new WaError(e.message ?? `WhatsApp HTTP ${status}`, { code: e.code ?? null, status, details });
}

/**
 * Kapso refusing its project key (HTTP 401 / 403 with no Meta code of its own) is a broken
 * credential, like Meta's 190: tagged so, the sender holds the line's queue instead of failing
 * every row, and media answers meta_error. Meta's own errors pass through unchanged.
 */
export function byDriver(env: WhatsappEnv, error: WaError): WaError {
  const { status, code } = error.info;
  if (env.provider !== 'kapso' || (status !== 401 && status !== 403) || isWaAuthError(code)) return error;
  if (code !== null && code !== status) return error;
  return new WaError(`Kapso refused the API key: ${error.message}`, { ...error.info, code: 190 });
}

/** Connection errors raised before any byte left: the request never reached Meta, so a retry is safe. */
const NEVER_SENT = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);

/**
 * Could this fetch error have happened after Meta got the request? A timeout or a dropped
 * connection can (Meta may have sent the message and only the answer was lost); a refused or
 * unresolvable connection cannot. Unknown errors count as uncertain: never resend blindly.
 */
export function mayHaveReachedMeta(error: unknown): boolean {
  const cause: unknown = error instanceof Error ? error.cause : undefined;
  const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
  return !NEVER_SENT.has(code);
}

/**
 * Resolves on 2xx; throws WaError otherwise. A network error or timeout is code null, status 0,
 * flagged `uncertain` unless the connection was never made.
 */
export async function graphFetch(conn: GraphConn, req: GraphRequest): Promise<Response> {
  const hasBody = req.body !== undefined;
  let res: Response;
  try {
    res = await conn.fetch(url(conn.env, req.path), {
      method: req.method ?? 'GET',
      headers: {
        ...(req.auth === false ? {} : authHeaders(conn.env)),
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...req.headers,
      },
      body: req.raw ?? (hasBody ? JSON.stringify(req.body) : undefined),
      signal: AbortSignal.timeout(conn.timeoutMs),
    });
  } catch (e) {
    const message = `WhatsApp request failed: ${e instanceof Error ? e.message : String(e)}`;
    throw new WaError(message, { code: null, status: 0, uncertain: mayHaveReachedMeta(e) });
  }
  if (res.ok) return res;
  throw byDriver(conn.env, waErrorFrom(res.status, await res.text().catch(() => '')));
}

/** graphFetch + the JSON body. */
export async function graphJson(conn: GraphConn, req: GraphRequest): Promise<unknown> {
  const res = await graphFetch(conn, req);
  return parse(await res.text());
}
