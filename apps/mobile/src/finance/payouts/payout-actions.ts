import type { PaymentMethod, PayoutView } from '@ab/shared';
import { paidAtFor } from '@/payments/lib/paid-day';
import type { Receipt } from '@/payments/receipt';

export type PayoutAction = 'approve' | 'pay' | 'reopen' | 'unpay' | 'receipt';

/** The web's buttons per state: draft → approve; approved → pay / reopen; paid → receipt / unpay. */
export function payoutActions(p: Pick<PayoutView, 'status' | 'has_receipt'>): PayoutAction[] {
  if (p.status === 'draft') return ['approve'];
  if (p.status === 'approved') return ['pay', 'reopen'];
  return p.has_receipt ? ['receipt', 'unpay'] : ['unpay'];
}

/** Shown beside «تأكيد الدفع»: the cash still due after per-session payments. The API recomputes it. */
export const dueOf = (p: Pick<PayoutView, 'amount' | 'ledger_paid'>): number =>
  Math.max(0, Math.round((p.amount - (p.ledger_paid ?? 0)) * 100) / 100);

export interface PayDraft {
  method: PaymentMethod;
  /** Days back on the Riyadh calendar; 0 = today. */
  daysAgo: number;
  note: string;
  receipt: Receipt | null;
}

/** POST /payouts/:id/pay (payoutPaySchema), the receipt already uploaded. */
export function payBody(draft: PayDraft, receiptPath: string | null, now: Date) {
  return {
    paidAt: paidAtFor(now, draft.daysAgo).toISOString(),
    method: draft.method,
    note: draft.note.trim() || null,
    receiptPath,
  };
}
