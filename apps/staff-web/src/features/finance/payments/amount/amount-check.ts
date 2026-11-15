import { amountFromStripe, parseAmount, type PaymentKind, type PaymentMethod } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** What the dialog says of the payment: its amount, currency and student. */
export interface AmountTarget {
  amount: number;
  currency: string;
  student: { name: string; code: string };
}

export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string };

/** The new amount typed: an amount (parseAmount), and not the one the payment already has. */
export function checkAmount(text: string, current: number): AmountCheck {
  const amount = parseAmount(text);
  if (amount === null) return { ok: false, error: t.payments.mobile.amountInvalid };
  const same = amount === current;
  return same ? { ok: false, error: t.payments.editAmount.same } : { ok: true, amount };
}

/** «تعديل المبلغ» is offered: never for a card payment, its amount comes from Stripe. */
export const amountEditable = (p: { method: PaymentMethod }): boolean =>
  !amountFromStripe(p.method);

interface SalesPayment {
  method: PaymentMethod;
  kind: PaymentKind;
}

/** The assistant's: a payment only (a refund is the admin's: 403 refund_not_allowed), not card. */
export const salesAmountEditable = (p: SalesPayment): boolean =>
  p.kind === 'payment' && amountEditable(p);
