import type { PublicPaymentLink } from '@ab/shared';

/** Where Stripe sent the payer back: `?done=1` (paid) or `?cancelled=1` (left the checkout). */
export type PayReturn = { done?: true; cancelled?: true };

export type PayScreen = 'open' | 'back' | 'thanks' | PublicPaymentLink['status'];

/**
 * The screen for a link and the way back from Stripe: an open link waits for the webhook after `done`
 * (thanks, no second «ادفع الآن»); `cancelled` keeps the button with «لم يكتمل الدفع». A paid link
 * thanks right after the payment, else says it is paid; expired, cancelled and processing say so.
 */
export function payScreen(status: PublicPaymentLink['status'], back: PayReturn): PayScreen {
  if (status === 'open') return back.done ? 'thanks' : back.cancelled ? 'back' : 'open';
  if (status === 'paid' && back.done) return 'thanks';
  return status;
}

/** The route's search: only `done=1` / `cancelled=1` count, anything else is dropped. */
export function parsePayReturn(search: Record<string, unknown>): PayReturn {
  const on = (v: unknown) => v === 1 || v === '1';
  return { ...(on(search['done']) ? { done: true } : {}), ...(on(search['cancelled']) ? { cancelled: true } : {}) };
}
