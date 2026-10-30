import { backoffDelay } from '../core/async/retry.js';
import { normalizePhone } from '../core/format/phone.js';

// WhatsApp Cloud API rules the sender, the webhook and the inbox share (docs/12 §3).

/**
 * Meta's wa_id (bare international digits, «966598917071») → E.164, or null when it is not a
 * phone. The + is added here: wa_id is always international (see the TODO in phone.ts).
 */
export function waIdToE164(waId: string): string | null {
  const digits = waId.replace(/\D/g, '');
  if (!digits) return null;
  const phone = normalizePhone(`+${digits}`);
  return phone.ok ? phone.e164 : null;
}

export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Free text (a session message) is allowed only within 24 h of the contact's last inbound
 * message; after that only an approved template goes out (inbox.sessionClosed).
 */
export function sessionWindowOpen(lastInboundAt: Date | string | null | undefined, now: Date): boolean {
  if (!lastInboundAt) return false;
  const at = typeof lastInboundAt === 'string' ? Date.parse(lastInboundAt) : lastInboundAt.getTime();
  if (Number.isNaN(at)) return false;
  return now.getTime() - at < SESSION_WINDOW_MS;
}

/**
 * R-MSG-03 fallback: «https://wa.me/966598917071?text=…» with the text prefilled. No URL /
 * URLSearchParams: @ab/shared also runs on Hermes. wa.me wants the number without the +.
 */
export function clickToChatLink(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Tries per outbound message before it is `failed` (and the admin gets reminder_failed). */
export const MAX_SEND_ATTEMPTS = 3;

const BACKOFF = { baseMs: 60_000, factor: 5, capMs: 60 * 60_000 };

/** Wait before try `attempt + 1`, after `attempt` failed tries: 1 min, 5 min, 25 min, … ≤ 1 h. */
export function backoff(attempt: number): number {
  return backoffDelay(Math.max(1, Math.floor(attempt)) - 1, BACKOFF);
}

/**
 * Meta errors worth another try: throttling and Meta-side outages. Everything else (template
 * missing 132001, bad parameters 132000/100, outside the 24 h window 131047, undeliverable
 * 131026, …) fails at once. null = no Meta code (network error, HTTP 5xx) → retry.
 */
const RETRYABLE = new Set([1, 2, 4, 80007, 130429, 131000, 131016, 131048, 131056, 133004]);

export function isRetryableWaError(code: number | null | undefined): boolean {
  return code === null || code === undefined || RETRYABLE.has(code);
}

/**
 * The access token expired or lost its permissions (190, 10, 200): every send fails the same way
 * until an admin fixes it in Business Manager, so the sender stops instead of failing each row.
 */
const AUTH = new Set([10, 190, 200]);

export function isWaAuthError(code: number | null | undefined): boolean {
  return code !== null && code !== undefined && AUTH.has(code);
}

/** The fields of a WhatsApp error that say whether the credential was refused. */
export interface WaAuthInfo {
  code: number | null | undefined;
  status?: number;
  /** The API's tag for a driver's own refused credential ('kapso', docs/19). */
  credential?: string;
}

/**
 * The credential was refused: Meta's code (190 / 10 / 200), or a driver's tag (the API tags a
 * Kapso 401 / 403 on a keyed request as 'kapso', docs/19). A bare HTTP status never counts: Meta
 * stays code-only, and Kapso's credential-free download_url is never tagged (its 401 is expiry).
 */
export function isWaAuthFailure(info: WaAuthInfo | null | undefined): boolean {
  return !!info && (isWaAuthError(info.code) || info.credential !== undefined);
}

/**
 * messages.error_code values where the admin's «حاول مرة أخرى» can't help: not on WhatsApp, the 24 h
 * window closed (a template is needed), too late for the lesson, no longer wanted, already handed
 * to the admin's own WhatsApp (that prompt answers it), the WhatsApp Business account is blocked
 * until an admin fixes it in Meta, or this row can never go out as it is. Throttling (131049,
 * 130429, 131056), maintenance (131057), a paused or missing template (132015, 132001), the test
 * allow-list (131030, Meta's or our own: add the number, then retry), network, http_*, auto_off, uncertain,
 * internal and unknown stay retryable.
 */
const RETRY_POINTLESS = new Set([
  '131026',
  '131047',
  'expired',
  'stale',
  'handed_off',
  // The account, until an admin fixes it in Meta: payment (131042), locked (131031), policy block
  // (368), number not registered (131045, 133010), display name (131037).
  '131042',
  '131031',
  '368',
  '131045',
  '133010',
  '131037',
  // This row: outside the 24 h window (470), marketing turned off (131050), our own number
  // (131021), template values (132000, 132012), template disabled for good (132016), file type (131053).
  '470',
  '131050',
  '131021',
  '132000',
  '132012',
  '132016',
  '131053',
]);

export function canRetryCode(code: string | null | undefined): boolean {
  return !RETRY_POINTLESS.has(code ?? '');
}
