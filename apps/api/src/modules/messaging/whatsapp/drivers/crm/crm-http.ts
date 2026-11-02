import { z } from 'zod';
import type { CrmLineEnv } from '../../../../../config/env/env';
import { mayHaveReachedMeta, type FetchLike } from '../meta/graph';
import { WaError } from '../../whatsapp.types';

// One call to the academy CRM's public REST API (docs/19 «crm driver»): Bearer key, JSON, timeout, and the
// CRM's envelope ({data} / {error:{code,message}}) → WaError. The CRM has no idempotency key, so an answer
// that may have come after the CRM reached Meta is `uncertain` (never resent automatically).

export interface CrmConn {
  env: CrmLineEnv;
  fetch: FetchLike;
  timeoutMs: number;
}

interface CrmRequest {
  /** Relative to the base («messages», «me»). */
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

const errorSchema = z.object({ error: z.object({ code: z.string().optional(), message: z.string().optional() }) });

/** The CRM's own refusals that mean nothing reached WhatsApp: fail with its code, never uncertain. */
const NOT_SENT_5XX = new Set(['meta_error', 'template_malformed']);
/** The CRM's own WhatsApp connection is down (400): the line, not the message, so held like a refused key. */
const LINE_DOWN = 'whatsapp_not_configured';
const RETRY_DEFAULT_MS = 60_000;
const RETRY_MAX_MS = 60 * 60_000;

function json(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Retry-After in seconds (an HTTP date counts too); unreadable = one minute, at most an hour. */
function retryAfterMs(header: string | null, now: Date = new Date()): number {
  const raw = header?.trim() ?? '';
  const ms = /^\d+$/.test(raw) ? Number(raw) * 1000 : Date.parse(raw) - now.getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, RETRY_MAX_MS) : RETRY_DEFAULT_MS;
}

/**
 * The CRM's failure → WaError. 401 / 403: the key is refused or lacks messages:send, and 400
 * whatsapp_not_configured: the CRM lost its own WhatsApp connection (credential 'crm': the line is held, rows stay queued). 429: retryAfterMs. 502 meta_error / 500 template_malformed / any other
 * 4xx: fails with crmCode (nothing was sent). Any other 5xx: uncertain (the CRM may have sent to Meta
 * before failing its own insert).
 */
export function crmErrorFrom(res: { status: number; text: string; retryAfter: string | null }): WaError {
  const { crmCode, said } = envelopeOf(res);
  const base = { code: null, status: res.status, crmCode, details: said };
  const message = `CRM HTTP ${res.status} ${crmCode}${said ? `: ${said}` : ''}`;
  if (res.status === 401 || res.status === 403) return new WaError(`CRM refused the API key: ${message}`, { ...base, credential: 'crm' });
  if (crmCode === LINE_DOWN) return new WaError(`CRM has no WhatsApp connection: ${message}`, { ...base, credential: 'crm' });
  if (res.status === 429) return new WaError(message, { ...base, retryAfterMs: retryAfterMs(res.retryAfter) });
  if (res.status >= 500 && !NOT_SENT_5XX.has(crmCode)) return new WaError(message, { ...base, uncertain: true });
  return new WaError(message, base);
}

/** The CRM's error code and message; a body that is not its envelope (a proxy's page) is http_<status> only, never shown. */
function envelopeOf(res: { status: number; text: string }): { crmCode: string; said: string | undefined } {
  const parsed = errorSchema.safeParse(json(res.text));
  if (!parsed.success) return { crmCode: `http_${res.status}`, said: undefined };
  return { crmCode: parsed.data.error.code ?? `http_${res.status}`, said: parsed.data.error.message };
}

/** The `data` of a 2xx answer; throws WaError otherwise (a network error is uncertain unless never connected). */
export async function crmJson(conn: CrmConn, req: CrmRequest): Promise<unknown> {
  const hasBody = req.body !== undefined;
  let res: Response;
  try {
    res = await conn.fetch(`${conn.env.base}/${req.path}`, {
      method: req.method ?? 'GET',
      headers: { authorization: `Bearer ${conn.env.apiKey}`, accept: 'application/json', ...(hasBody ? { 'content-type': 'application/json' } : {}) },
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(conn.timeoutMs),
      // The CRM never redirects: a 3xx (a wrong base) is a plain «not sent» failure, never a POST turned GET.
      redirect: 'manual',
    });
  } catch (e) {
    const message = `CRM request failed: ${e instanceof Error ? e.message : String(e)}`;
    throw new WaError(message, { code: null, status: 0, uncertain: mayHaveReachedMeta(e) });
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) throw crmErrorFrom({ status: res.status, text, retryAfter: res.headers.get('retry-after') });
  const body = json(text);
  return body && typeof body === 'object' && 'data' in body ? body.data : null;
}
