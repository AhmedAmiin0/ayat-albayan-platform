import {
  backoff, isRetryableWaError, isWaAuthFailure, MAX_SEND_ATTEMPTS, WINDOW_CLOSED,
} from '@ab/shared';
import { crmPlan } from '@/modules/messaging/whatsapp/drivers/crm/crm-plan';
import { driverCode } from '@/modules/messaging/whatsapp/drivers/driver-codes';
import { lineDownHold } from './hold/line-down';
import { paymentHold, type HoldRow } from './hold/payment-hold';
import { isWindowClosedError } from './window/window-rules';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The sender's pure decisions (docs/12 §3.3): what to send, what a failure leads to.

/** How long a claimed row is held: a worker that dies mid-send frees it after this. */
export const CLAIM_LEASE_MS = 2 * 60_000;
/** error_code written with the claim, before Meta is called (write-ahead). */
export const SENDING = 'sending';
/** error_code of a row Meta may or may not have sent: the admin checks before resending. */
export const UNCERTAIN = 'uncertain';
/** error_code while the admin sends it from their own WhatsApp (M3), to confirm in the UI. */
export const HANDED_OFF = 'handed_off';
/** An expired / revoked token holds the queue this long before the next try (uncounted). */
export const AUTH_HOLD_MS = 15 * 60_000;
export { KAPSO_AUTH, CRM_AUTH, EVOLUTION_AUTH } from '@/modules/messaging/whatsapp/drivers/driver-codes';
export { CRM_RATE_LIMITED } from '@/modules/messaging/whatsapp/drivers/crm/crm-plan';
export { messageLabel } from './plan/message-label';
export { quickReplyPayloads, readyToSend, reportIdOf } from './plan/send-row';
export type { Sendable } from './plan/send-row.types';
const ERROR_TEXT_MAX = 500;

export interface FailurePlan {
  status: 'queued' | 'failed';
  next_attempt_at: string | null;
  error_code: string;
  error_text: string;
  /** Set when the try is not counted (auth hold): the claim's +1 is undone. */
  attempts?: number;
}

/** `row`: its due / expiry times, for the payment hold. */
interface PlanInput { error: unknown; attempts: number; now: Date; row?: HoldRow }

/** messages.error_code: Meta's code («131026»), else what kind of failure it was. */
export function errorCode(error: unknown): string {
  if (!(error instanceof WaError)) return 'internal';
  const own = driverCode(error.info);
  if (own) return own;
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
 * Meta's throttling and outage codes retry with backoff (1 min, 5 min, …) up to MAX_SEND_ATTEMPTS;
 * anything else (131026 not on WhatsApp, 132001 template missing, the window closed: Meta 131047 /
 * Kapso 422 = window_closed, bad parameters) fails at once. A timeout / dropped connection
 * (`uncertain`: Meta may have sent it) fails at once too, for the admin to check instead of a
 * blind resend. The provider down (lineDown: a 5xx with no code, a refused connection) holds the
 * row, uncounted, as its lane's probe (hold/line-down). An auth error (190 / 10 / 200, or Kapso /
 * the CRM refusing its key) holds the row, uncounted: the credential is broken.
 * Meta's 131042 (no payment method on the WABA; meta, kapso) holds it too (hold/payment-hold).
 * The crm driver: a 429 waits for its Retry-After (uncounted); any other CRM error code fails at
 * once. `attempts` counts this try.
 */
export function failurePlan(input: PlanInput): FailurePlan {
  const info = input.error instanceof WaError ? input.error.info : null;
  const ctx: HoldInput = { ...input, info, error_text: errorText(input.error) };
  for (const step of FIRST_MATCH) {
    const plan = step(ctx);
    if (plan) return plan;
  }
  return retryOrFail(ctx);
}

/** Failed for good with its code (a retry overrides status and next_attempt_at). */
const plain = (error: unknown, error_text: string): FailurePlan => ({
  status: 'failed',
  next_attempt_at: null,
  error_code: errorCode(error),
  error_text,
});

/** The account or the line, not the message: a refused credential, an outage, Meta's 131042. */
interface HoldInput extends PlanInput {
  info: WaError['info'] | null;
  error_text: string;
}

type Step = (c: HoldInput) => FailurePlan | null;

const uncertain: Step = (c) =>
  c.info?.uncertain
    ? { status: 'failed', next_attempt_at: null, error_code: UNCERTAIN, error_text: c.error_text }
    : null;

/** Never retried: the worker holds a staff chat text behind the reopen template (window/). */
const windowClosed: Step = (c) =>
  isWindowClosedError(c.error)
    ? { ...plain(c.error, c.error_text), error_code: WINDOW_CLOSED }
    : null;

const crm: Step = (c) => {
  const { info, attempts, now, error_text } = c;
  return crmPlan({ info, attempts, now, error_text, error_code: errorCode(c.error) });
};

function retryOrFail(c: HoldInput): FailurePlan {
  const failed = plain(c.error, c.error_text);
  const retry = isRetryableWaError(c.info?.code ?? null) && c.attempts < MAX_SEND_ATTEMPTS;
  const next_attempt_at = new Date(c.now.getTime() + backoff(c.attempts)).toISOString();
  return retry ? { ...failed, status: 'queued', next_attempt_at } : failed;
}

function accountHold(h: HoldInput): FailurePlan | null {
  const until = new Date(h.now.getTime() + AUTH_HOLD_MS).toISOString();
  if (isWaAuthFailure(h.info)) return authHold({ ...h, until });
  return lineDownHold(h) ?? paymentHold(h);
}

/** The token is broken, not the message: back in the queue, this try not counted. */
function authHold(h: HoldInput & { until: string }): FailurePlan {
  const attempts = Math.max(0, h.attempts - 1);
  return {
    status: 'queued',
    next_attempt_at: h.until,
    error_code: errorCode(h.error),
    error_text: h.error_text,
    attempts,
  };
}

const FIRST_MATCH: readonly Step[] = [uncertain, windowClosed, accountHold, crm];
