import { amountFromStripe, parseAmount, type PaymentKind, type PaymentMethod } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// «تعديل المبلغ» of a recorded payment (owner 2026-11-02). Pure: the API re-checks every amount.

const e = t.payments.editAmount;

type AmountEditCheck = { ok: true; amount: number } | { ok: false; error: string };

/** The new amount: a positive number (≤ 2 decimals, Arabic digits too) other than the current. */
export function checkNewAmount(text: string, current: number): AmountEditCheck {
  const amount = parseAmount(text);
  if (amount === null) return { ok: false, error: t.payments.mobile.amountInvalid };
  return amount === current ? { ok: false, error: e.same } : { ok: true, amount };
}

/** A card payment's amount is Stripe's: never edited by hand (the admin's rows). */
export const amountEditable = (p: { method: PaymentMethod }): boolean =>
  !amountFromStripe(p.method);

/** Hers: a payment (never a refund), not a card one (PATCH /sales/payments/:id/amount). */
export const salesAmountEditable = (p: { method: PaymentMethod; kind: PaymentKind }): boolean =>
  p.kind === 'payment' && amountEditable(p);
