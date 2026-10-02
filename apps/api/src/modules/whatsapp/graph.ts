import { z } from 'zod';
import type { WhatsappEnv } from '../../env';
import { WaError } from './whatsapp.types';

// One Graph API call: bearer, JSON, timeout, and Meta's error body → WaError (docs/12 §3.2).

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
        authorization: `Bearer ${conn.env.accessToken}`,
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(conn.timeoutMs),
    });
  } catch (e) {
    const message = `WhatsApp request failed: ${e instanceof Error ? e.message : String(e)}`;
    throw new WaError(message, { code: null, status: 0, uncertain: mayHaveReachedMeta(e) });
  }
  if (res.ok) return res;
  throw waErrorFrom(res.status, await res.text().catch(() => ''));
}

/** graphFetch + the JSON body. */
export async function graphJson(conn: GraphConn, req: GraphRequest): Promise<unknown> {
  const res = await graphFetch(conn, req);
  return parse(await res.text());
}
