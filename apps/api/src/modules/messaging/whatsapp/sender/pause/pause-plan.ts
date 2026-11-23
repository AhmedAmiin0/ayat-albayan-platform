import { outageSubject, WA_LINE_DOWN } from '@/modules/messaging/whatsapp/sender/hold/line-down';
import { paymentSubject, WA_PAYMENT_HOLD } from '@/modules/messaging/whatsapp/sender/hold/payment-hold';
import { authSubject } from '@/modules/messaging/whatsapp/sender/message.job';
import { CRM_RATE_LIMITED, type FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { Pause, PauseAt } from './pause-plan.types';

// The failures that pause a lane for the rest of the pass instead of failing the row (docs/12
// §3.3), first match wins. Each push subject is per line (number) and period, so it is one push.

type Case = [(plan: FailurePlan) => boolean, (at: PauseAt) => Pause];

const CASES: readonly Case[] = [
  // The CRM's rate limit (per key): the line waits for Retry-After; not a token failure, no push.
  [(p) => p.error_code === CRM_RATE_LIMITED, () => ({ subject: null, log: null })],
  [
    (p) => p.error_code === WA_PAYMENT_HOLD,
    (a) => ({
      subject: paymentSubject(a),
      log: `WhatsApp refused for payment (131042) on ${a.line}: message ${a.row.id} held`,
    }),
  ],
  [
    (p) => p.error_code === WA_LINE_DOWN,
    (a) => ({
      subject: outageSubject(a),
      log: `WhatsApp provider down on ${a.line}: message ${a.row.id} is the probe; ${a.plan.error_text}`,
    }),
  ],
  // Any other uncounted try is the token, not the message (fixed in Business Manager).
  [
    (p) => p.attempts !== undefined,
    (a) => ({
      subject: authSubject(a),
      log: `WhatsApp refused the token (${a.plan.error_code}); sending paused: ${a.plan.error_text}`,
    }),
  ],
];

/** The lane's pause for this failure; null = the row alone retries or fails. */
export function pauseOf(at: PauseAt): Pause | null {
  return CASES.find(([is]) => is(at.plan))?.[1](at) ?? null;
}

/** Timeouts in a row on one lane: its rows wait (the timed-out ones stay uncertain). */
export const timeoutPause = (at: Omit<PauseAt, 'plan'>): Pause => ({
  subject: outageSubject(at),
  log: `WhatsApp sends keep timing out on ${at.line}: the lane waits (message ${at.row.id})`,
});
