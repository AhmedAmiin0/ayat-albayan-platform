import { z } from 'zod';
import type { CrmLineEnv } from '@/config/env/env';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { FetchLike, HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import { reachInfo, TIMEOUT_INFO } from '@/modules/messaging/whatsapp/drivers/transport-info';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

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
/** A proxy's 503 page (no envelope): the CRM itself is down, so the lane is held, not the row. */
const CRM_DOWN = 'http_503';
/** The CRM's own WhatsApp connection is down (400): the line, not the message, so held like a refused key. */
const LINE_DOWN = 'whatsapp_not_configured';
const RETRY_DEFAULT_MS = 60_000;
const RETRY_MAX_MS = 60 * 60_000;
/** A scope as the CRM names it in a 403 («missing the 'templates:read' scope»). */
const SCOPE_IN = /\b([a-z_]+:[a-z_]+)\b/;

/** The scope a 403 says the key lacks; none when the CRM names none (a plain refusal). */
const missingScope = (status: number, said: string | undefined): { missingScope?: string } => {
  const scope = status === 403 ? SCOPE_IN.exec(said ?? '')?.[1] : undefined;
  return scope ? { missingScope: scope } : {};
};

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

interface CrmAnswer {
  status: number;
  body: unknown;
  retryAfter: string | null;
}

/** A CRM error answer as its raw text (tests and the send plan build one this way). */
export function crmErrorFrom(res: { status: number; text: string; retryAfter: string | null }): WaError {
  return crmErrorOf({ status: res.status, body: json(res.text), retryAfter: res.retryAfter });
}

/** 401/403 bad key or scope; 429 retryAfterMs; 503 no envelope is down; other 5xx is uncertain. */
function crmErrorOf(res: CrmAnswer): WaError {
  const { crmCode, said } = envelopeOf(res);
  const base = { code: null, status: res.status, crmCode, details: said };
  const message = `CRM HTTP ${res.status} ${crmCode}${said ? `: ${said}` : ''}`;
  const refused = { ...base, credential: 'crm' as const, ...missingScope(res.status, said) };
  if (res.status === 401 || res.status === 403) return new WaError(`CRM refused the API key: ${message}`, refused);
  if (crmCode === LINE_DOWN) return new WaError(`CRM has no WhatsApp connection: ${message}`, { ...base, credential: 'crm' });
  if (res.status === 429) return new WaError(message, { ...base, retryAfterMs: retryAfterMs(res.retryAfter) });
  if (crmCode === CRM_DOWN) return new WaError(message, { ...base, lineDown: true });
  if (res.status >= 500 && !NOT_SENT_5XX.has(crmCode)) return new WaError(message, { ...base, uncertain: true });
  return new WaError(message, base);
}

/** The CRM's error code and message; a body that is not its envelope (a proxy's page) is http_<status> only, never shown. */
function envelopeOf(res: Pick<CrmAnswer, 'status' | 'body'>): { crmCode: string; said: string | undefined } {
  const parsed = errorSchema.safeParse(res.body);
  if (!parsed.success) return { crmCode: `http_${res.status}`, said: undefined };
  return { crmCode: parsed.data.error.code ?? `http_${res.status}`, said: parsed.data.error.message };
}

/** Only a status failure reaches the default: every other kind has its own entry. */
const NO_STATUS: CrmAnswer = { status: 0, body: null, retryAfter: null };
const answerOf = (f: HttpFailure): CrmAnswer => (f.kind === 'status' ? f : NO_STATUS);

/** A network error is uncertain unless the call never connected; the deadline is uncertain too. */
const CRM_ERRORS: ErrorTable<WaError> = {
  network: (f) => new WaError('CRM request failed', reachInfo(f.kind === 'network' && f.reached)),
  timeout: () => new WaError('CRM request failed: timed out', TIMEOUT_INFO),
  default: (f) => crmErrorOf(answerOf(f)),
};

/** The envelope's `data`; any other 2xx body is null. */
const dataSchema = z.union([
  z.looseObject({ data: z.unknown() }).transform((b) => b.data ?? null),
  z.unknown().transform(() => null),
]);

// The CRM never redirects: a 3xx (a wrong base) is a plain «not sent» failure, never a POST turned GET.
const crmHttp = (conn: CrmConn) =>
  createHttp({
    name: 'crm',
    base: () => conn.env.base,
    headers: () =>
      Promise.resolve({ authorization: `Bearer ${conn.env.apiKey}`, accept: 'application/json' }),
    timeoutMs: conn.timeoutMs,
    redirect: 'manual',
    errorBody: z.unknown(),
    errors: CRM_ERRORS,
    fetch: conn.fetch,
  });

/** The `data` of a 2xx answer; throws WaError otherwise. */
export async function crmJson(conn: CrmConn, req: CrmRequest): Promise<unknown> {
  const call = { path: req.path, method: req.method ?? 'GET', json: req.body, schema: dataSchema };
  return crmHttp(conn).json(call);
}
