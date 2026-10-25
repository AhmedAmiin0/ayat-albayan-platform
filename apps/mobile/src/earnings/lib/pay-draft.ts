import { amountProblem, parseAmount, type PaymentMethod } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { paidAtFor } from '@/payments/lib/paid-day';
import type { Receipt } from '@/payments/receipt';
import { egp } from './format';

/** What the admin has entered in «سجّل دفعة». The method is not preselected: the receipt says which. */
export interface PayDraft {
  amountText: string;
  method?: PaymentMethod;
  /** Days back on the Riyadh calendar; 0 = today (payments/paid-day.ts). */
  daysAgo: number;
  receipt: Receipt | null;
}

export interface PayInput {
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  receipt: Receipt | null;
  /** The ticked sessions; undefined = every unpaid one, oldest first (the API's default). */
  earningIds: string[] | undefined;
}

export interface PayCheck {
  input?: PayInput;
  errors: { amount?: string; method?: string };
}

/** The payment to send, or why not. `ceiling` = what the ticked sessions (or the whole balance) still owe. */
export function checkPayDraft(draft: PayDraft, ctx: { ceiling: number; now: Date; earningIds: string[] | undefined }): PayCheck {
  const amount = parseAmount(draft.amountText);
  const problem = amountProblem({ amount, text: draft.amountText, ceiling: ctx.ceiling });
  const errors: PayCheck['errors'] = {};
  if (problem === 'required') errors.amount = t.common.required;
  if (problem === 'invalid') errors.amount = t.payments.mobile.amountInvalid;
  if (problem === 'overpayment') errors.amount = t.earnings.overpayment.replace('{amount}', egp(ctx.ceiling));
  if (!draft.method) errors.method = t.common.required;
  if (problem || amount === null || !draft.method) return { errors };
  const paidAt = paidAtFor(ctx.now, draft.daysAgo).toISOString();
  return { errors, input: { amount, method: draft.method, paidAt, receipt: draft.receipt, earningIds: ctx.earningIds } };
}
