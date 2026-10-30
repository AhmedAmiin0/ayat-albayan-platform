import { isWaPaymentHold, type WaLine } from '@ab/shared';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// Meta 131042 (no valid payment method on the WABA) is the ACCOUNT, not the message: the row waits
// in the queue, the try not counted, until the owner fixes billing in Meta (docs/12 §3.3).

/** messages.error_code of a row held by Meta's 131042: queued, shown as waiting with the reason. */
export const WA_PAYMENT_HOLD = 'wa_payment_hold';
/** The first hold; each later one is the time waited + this, so it doubles: 30 min, 1 h, 2 h… */
const PAYMENT_HOLD_MIN_MS = 30 * 60_000;
/** The longest single hold. */
const PAYMENT_HOLD_MAX_MS = 6 * 60 * 60_000;
/** A row due this long ago is not held: it fails with Meta's 131042 as before (never days late). */
const PAYMENT_HOLD_MAX_AGE_MS = 48 * 60 * 60_000;

/** The row columns the hold reads (DUE_COLUMNS); optional so older fixtures compile. */
export interface HoldRow {
  created_at?: string;
  scheduled_for?: string | null;
  expires_at: string | null;
}

interface PaymentInput {
  info: WaError['info'] | null;
  row?: HoldRow;
  /** This try included (the claim's +1). */
  attempts: number;
  now: Date;
  error_text: string;
}

/** How long the row has waited since due (scheduled_for, else created_at); 0 when unknown. */
function waitedMs(row: HoldRow | undefined, now: Date): number {
  const since = Date.parse(row?.scheduled_for ?? row?.created_at ?? '');
  return Number.isFinite(since) ? Math.max(0, now.getTime() - since) : 0;
}

/** Never past the row's own expiry: at expires_at the worker's dropReason expires it as usual. */
export function holdUntil(row: HoldRow | undefined, untilMs: number): string {
  const expires = Date.parse(row?.expires_at ?? '');
  return new Date(Number.isFinite(expires) ? Math.min(untilMs, expires) : untilMs).toISOString();
}

/**
 * Meta's 131042 → queued as wa_payment_hold, the try not counted, the next try after the time
 * already waited + 30 min (≤ 6 h, never past expires_at). null = not a payment error, or the row
 * was due PAYMENT_HOLD_MAX_AGE_MS ago (then it fails as 131042). Only a thrown answer reaches
 * here: a 2xx with a wamid is a success, so a held row was never accepted by Meta (no double send).
 */
export function paymentHold(p: PaymentInput): FailurePlan | null {
  if (!p.info || !isWaPaymentHold(p.info.code)) return null;
  const waited = waitedMs(p.row, p.now);
  if (waited >= PAYMENT_HOLD_MAX_AGE_MS) return null;
  const hold = Math.min(PAYMENT_HOLD_MAX_MS, waited + PAYMENT_HOLD_MIN_MS);
  return {
    status: 'queued',
    next_attempt_at: holdUntil(p.row, p.now.getTime() + hold),
    error_code: WA_PAYMENT_HOLD,
    error_text: p.error_text,
    attempts: Math.max(0, p.attempts - 1),
  };
}

/** The in-memory line hold's key: the line under legacy, the number in module mode (docs/23c). */
export function holdKey(at: { line: WaLine; route?: NumberRoute | null }): string {
  return at.route ? `number:${at.route.numberId}` : `line:${at.line}`;
}

/** The payment push subject, one per line (module mode: per number) per day, as the token push. */
export function paymentSubject(at: {
  line: WaLine;
  route?: NumberRoute | null;
  now: Date;
}): string {
  const day = at.now.toISOString().slice(0, 10);
  if (at.route) return `whatsapp_payment:number:${at.route.numberId}:${day}`;
  return `whatsapp_payment:${at.line === 'chat' ? 'chat:' : ''}${day}`;
}
