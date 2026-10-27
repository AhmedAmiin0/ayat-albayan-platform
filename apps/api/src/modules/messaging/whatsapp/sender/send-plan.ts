import type { Json } from '@ab/db';
import {
  backoff,
  waSendKind,
  isRetryableWaError,
  isWaAuthFailure,
  MAX_SEND_ATTEMPTS,
  quickReplyPayload,
  type TemplateButton,
  type TemplateParams,
} from '@ab/shared';
import { ar } from '../../../../common/i18n/server-text';
import { crmPlan } from '../drivers/crm/crm-plan';
import { templateParams } from '../messages/wa-json';
import { WaError, type TemplateRow } from '../whatsapp.types';

// The sender's pure decisions (docs/12 §3.3): what to send, what a failure leads to.

/** How long a claimed row is held: a worker that dies mid-send frees it after this. */
export const CLAIM_LEASE_MS = 2 * 60_000;
/** error_code written with the claim, before Meta is called (write-ahead; see SenderQueries.claim). */
export const SENDING = 'sending';
/** error_code of a row Meta may or may not have sent: the admin checks WhatsApp before resending. */
export const UNCERTAIN = 'uncertain';
/** error_code while the admin sends it from their own WhatsApp (M3); the UI asks them to confirm. */
export const HANDED_OFF = 'handed_off';
/** An expired / revoked token holds the queue this long before the next try (no attempt counted). */
export const AUTH_HOLD_MS = 15 * 60_000;
/** messages.error_code when Kapso refused the line's project key (docs/19): held like an auth error. */
export const KAPSO_AUTH = 'kapso_auth';
/** messages.error_code when the CRM refused its API key or it lacks messages:send (docs/19): held the same way. */
export const CRM_AUTH = 'crm_auth';
export { CRM_RATE_LIMITED } from '../drivers/crm/crm-plan';
const ERROR_TEXT_MAX = 500;

export interface FailurePlan {
  status: 'queued' | 'failed';
  next_attempt_at: string | null;
  error_code: string;
  error_text: string;
  /** Set when the try is not counted (auth hold): the claim's +1 is undone. */
  attempts?: number;
}

/** messages.error_code: Meta's code («131026»), else what kind of failure it was. */
export function errorCode(error: unknown): string {
  if (!(error instanceof WaError)) return 'internal';
  if (error.info.credential === 'kapso') return KAPSO_AUTH;
  if (error.info.credential === 'crm') return CRM_AUTH;
  if (error.info.crmCode) return `crm_${error.info.crmCode}`;
  if (error.info.code !== null) return String(error.info.code);
  return error.info.status ? `http_${error.info.status}` : 'network';
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, ERROR_TEXT_MAX);
  const details = error instanceof WaError ? error.info.details : undefined;
  return [error.message, details].filter(Boolean).join(' — ').slice(0, ERROR_TEXT_MAX);
}

/**
 * Throttling, Meta outages and connection errors retry with backoff (1 min, 5 min, …) until
 * MAX_SEND_ATTEMPTS; anything else (131026 not on WhatsApp, 132001 template missing, 131047
 * window closed, bad parameters) fails at once. A timeout / dropped connection (`uncertain`: Meta
 * may have sent it) fails at once too, for the admin to check instead of a blind resend. An auth
 * error (190 / 10 / 200, or Kapso / the CRM refusing its key) holds the row, uncounted: the credential is broken.
 * The crm driver: a 429 waits for its Retry-After (uncounted); any other CRM error code fails at once.
 * `attempts` counts this try.
 */
export function failurePlan(input: { error: unknown; attempts: number; now: Date }): FailurePlan {
  const info = input.error instanceof WaError ? input.error.info : null;
  const at = (ms: number) => new Date(input.now.getTime() + ms).toISOString();
  const error_text = errorText(input.error);
  if (info?.uncertain) return { status: 'failed', next_attempt_at: null, error_code: UNCERTAIN, error_text };
  if (isWaAuthFailure(info)) return authHold({ ...input, error_text, until: at(AUTH_HOLD_MS) });
  const crm = crmPlan({ info, attempts: input.attempts, now: input.now, error_text, error_code: errorCode(input.error) });
  if (crm) return crm;
  const retry = isRetryableWaError(info?.code ?? null) && input.attempts < MAX_SEND_ATTEMPTS;
  return retry ? { ...plain(input.error, error_text), status: 'queued', next_attempt_at: at(backoff(input.attempts)) } : plain(input.error, error_text);
}

/** Failed for good with its code (a retry overrides status and next_attempt_at). */
const plain = (error: unknown, error_text: string): FailurePlan => ({ status: 'failed', next_attempt_at: null, error_code: errorCode(error), error_text });

/** The token is broken, not the message: back in the queue, this try not counted. */
function authHold(h: { error: unknown; attempts: number; error_text: string; until: string }): FailurePlan {
  const attempts = Math.max(0, h.attempts - 1);
  return { status: 'queued', next_attempt_at: h.until, error_code: errorCode(h.error), error_text: h.error_text, attempts };
}

/**
 * Quick-reply payloads by button index: the producer's params.payloads[i], else
 * quickReplyPayload(intent, ref) with ref = lesson ?? lead ?? message id. URL buttons get ''.
 */
export function quickReplyPayloads(buttons: readonly TemplateButton[], input: { params: TemplateParams; ref: string }): string[] {
  return buttons.map((b, i) => input.params.payloads?.[i] ?? (b.type === 'quick_reply' ? quickReplyPayload(b.intent, input.ref) : ''));
}

export interface Sendable {
  template_key: string | null;
  template_params: Json | null;
  body: string | null;
}

/**
 * false = not yet: a document template whose PDF is not attached yet (the report job points the
 * queued row at it). Such a row is not claimed and no attempt is counted.
 */
export function readyToSend(row: Sendable, template: TemplateRow | null): boolean {
  if (!row.template_key) return true;
  if (!template) return false;
  return template.header_format !== 'document' || templateParams(row.template_params).document !== undefined;
}

const REPORT_PREFIX = 'report_ready:';

/** The lesson report a report_ready row delivers: its dedup key is `report_ready:{report id}`. */
export function reportIdOf(dedupKey: string | null): string | null {
  return dedupKey?.startsWith(REPORT_PREFIX) ? dedupKey.slice(REPORT_PREFIX.length) || null : null;
}

const LABEL_TEXT_MAX = 40;

/**
 * What failed, for the reminder_failed push: «تذكير الحلقة النهاردة — Jitsi» for a template (the
 * raw key when unknown), the start of the text for a session message, «صورة» / «رسالة صوتية» / «فيديو» /
 * «ملف» for a file sent without a caption.
 */
export function messageLabel(row: { template_key: string | null; body: string | null; media_path?: string | null; media_mime?: string | null }): string {
  const names: Record<string, string> = ar.templates.names;
  if (row.template_key) return names[row.template_key] ?? row.template_key;
  const text = (row.body ?? '').trim();
  if (!text && row.media_path) return ar.inbox.media[waSendKind(row.media_mime ?? null)];
  return text.length > LABEL_TEXT_MAX ? `${text.slice(0, LABEL_TEXT_MAX)}…` : text;
}
