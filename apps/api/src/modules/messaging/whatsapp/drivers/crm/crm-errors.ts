import { z } from 'zod';
import { parseJson } from '@/common/infra/cache/cache-store';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The CRM's envelope ({error:{code,message}}) and status → WaError (docs/19 «crm driver»).

const errorSchema = z.object({
  error: z.object({ code: z.string().optional(), message: z.string().optional() }),
});

/** CRM refusals where nothing reached WhatsApp: fail with its code, never uncertain. */
const NOT_SENT_5XX = new Set(['meta_error', 'template_malformed']);
/** A proxy's 503 page (no envelope): the CRM itself is down, so the lane is held, not the row. */
const CRM_DOWN = 'http_503';
/** The CRM's own WhatsApp connection is down (400): the line, not the message, held like a key. */
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

const delayOf = (raw: string, now: Date): number =>
  /^\d+$/.test(raw) ? Number(raw) * 1000 : Date.parse(raw) - now.getTime();

/** Retry-After in seconds (an HTTP date counts too); unreadable = one minute, at most an hour. */
function retryAfterMs(header: string | null, now: Date = new Date()): number {
  const ms = delayOf(header?.trim() ?? '', now);
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, RETRY_MAX_MS) : RETRY_DEFAULT_MS;
}

interface CrmAnswer {
  status: number;
  body: unknown;
  retryAfter: string | null;
}

/**
 * The CRM's error code and message; a body that is not its envelope (a proxy's page) is
 * http_<status> only, never shown.
 */
function envelopeOf(res: Pick<CrmAnswer, 'status' | 'body'>): {
  crmCode: string;
  said: string | undefined;
} {
  const parsed = errorSchema.safeParse(res.body);
  if (!parsed.success) return { crmCode: `http_${res.status}`, said: undefined };
  return {
    crmCode: parsed.data.error.code ?? `http_${res.status}`,
    said: parsed.data.error.message,
  };
}

interface Refusal extends CrmAnswer {
  crmCode: string;
  said: string | undefined;
  message: string;
  base: WaError['info'];
}

type Rule = readonly [(r: Refusal) => boolean, (r: Refusal) => WaError];

/** First match wins: a refused key or scope, the CRM's line down, 429, a 503 page, other 5xx. */
const RULES: readonly Rule[] = [
  [
    (r) => r.status === 401 || r.status === 403,
    (r) =>
      new WaError(`CRM refused the API key: ${r.message}`, {
        ...r.base,
        credential: 'crm',
        ...missingScope(r.status, r.said),
      }),
  ],
  [
    (r) => r.crmCode === LINE_DOWN,
    (r) =>
      new WaError(`CRM has no WhatsApp connection: ${r.message}`, { ...r.base, credential: 'crm' }),
  ],
  [
    (r) => r.status === 429,
    (r) => new WaError(r.message, { ...r.base, retryAfterMs: retryAfterMs(r.retryAfter) }),
  ],
  [(r) => r.crmCode === CRM_DOWN, (r) => new WaError(r.message, { ...r.base, lineDown: true })],
  [
    (r) => r.status >= 500 && !NOT_SENT_5XX.has(r.crmCode),
    (r) => new WaError(r.message, { ...r.base, uncertain: true }),
  ],
];

/** 401/403 bad key or scope; 429 retryAfterMs; 503 no envelope is down; other 5xx is uncertain. */
export function crmErrorOf(res: CrmAnswer): WaError {
  const { crmCode, said } = envelopeOf(res);
  const base = { code: null, status: res.status, crmCode, details: said };
  const message = `CRM HTTP ${res.status} ${crmCode}${said ? `: ${said}` : ''}`;
  const refusal: Refusal = { ...res, crmCode, said, message, base };
  const rule = RULES.find(([applies]) => applies(refusal));
  return rule ? rule[1](refusal) : new WaError(message, base);
}

/** A CRM error answer as its raw text (tests and the send plan build one this way). */
export function crmErrorFrom(res: {
  status: number;
  text: string;
  retryAfter: string | null;
}): WaError {
  const body = parseJson<unknown>(res.text)?.value ?? null;
  return crmErrorOf({ status: res.status, body, retryAfter: res.retryAfter });
}
