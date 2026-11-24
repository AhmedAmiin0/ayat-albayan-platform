import type { WaLine } from '@ab/catalog';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { holdUntil, paymentHoldAged, type HoldRow } from './payment-hold';

// A provider outage (a 5xx with no Meta code, a refused connection, the CRM's 503 page) is the
// line, not the message: the row waits, the try not counted, and the lane waits behind it.

/** messages.error_code of a row held by an outage: queued, shown as waiting with the reason. */
export const WA_LINE_DOWN = 'wa_line_down';
/** The first outage hold; each renewal doubles it. Short: most outages last minutes. */
export const LINE_DOWN_MIN_MS = 60_000;
/** The longest single outage hold: the line is probed at least this often. */
export const LINE_DOWN_MAX_MS = 30 * 60_000;

interface LineDownInput {
  info: WaError['info'] | null;
  row?: HoldRow;
  /** This try included (the claim's +1). */
  attempts: number;
  now: Date;
  error_text: string;
}

/**
 * The line is down → queued as wa_line_down, the try not counted, next try in 1 min (the lane
 * hold then sets it; never past expires_at). null = not the line, or the row was due 48 h ago
 * (its tries count as before: never days late).
 */
export function lineDownHold(p: LineDownInput): FailurePlan | null {
  if (!p.info?.lineDown || paymentHoldAged(p.row, p.now)) return null;
  return {
    status: 'queued',
    next_attempt_at: holdUntil(p.row, p.now.getTime() + LINE_DOWN_MIN_MS),
    error_code: WA_LINE_DOWN,
    error_text: p.error_text,
    attempts: Math.max(0, p.attempts - 1),
  };
}

/** The outage push subject: one per line (module mode: per number) per hour, as the token push. */
export function outageSubject(at: { line: WaLine; route?: NumberRoute | null; now: Date }): string {
  const hour = at.now.toISOString().slice(0, 13);
  if (at.route) return `whatsapp_outage:number:${at.route.numberId}:${hour}`;
  return `whatsapp_outage:${at.line}:${hour}`;
}
