import { z } from 'zod';
import type { PaymentKind, PaymentMethod } from '@ab/catalog';
import { round2 } from '@ab/core';
import { moneyAmount } from '../schemas.js';

/**
 * «تعديل المبلغ» (owner 2026-11-02): PATCH /sales/payments/:id/amount takes the new amount only, in
 * the payment's (the package's) currency. The admin's PATCH /payments/:id keeps its own body.
 */
export const paymentAmountSchema = z.strictObject({ amount: moneyAmount });
export type PaymentAmount = z.output<typeof paymentAmountSchema>;

export type AmountEditProblem = 'stripe_amount_locked' | 'refund_exceeds_paid';

type Recorded = { method: PaymentMethod; kind: PaymentKind; amount: number };

/** A card payment's amount is what Stripe charged or refunded: never typed by hand. */
const FROM_STRIPE: ReadonlySet<PaymentMethod> = new Set<PaymentMethod>(['card']);
const SIGN: Record<PaymentKind, number> = { payment: 1, refund: -1 };

export const amountFromStripe = (method: PaymentMethod): boolean => FROM_STRIPE.has(method);

/**
 * Why a recorded payment's amount may not become `next.amount`, or null. `next.netPaid`: the
 * package's net now (payments − refunds, this one included); the edit may not take it below 0.
 */
export function amountEditProblem(
  before: Recorded,
  next: { amount: number; netPaid: number },
): AmountEditProblem | null {
  if (amountFromStripe(before.method)) return 'stripe_amount_locked';
  const net = round2(next.netPaid + SIGN[before.kind] * (next.amount - before.amount));
  return net < 0 ? 'refund_exceeds_paid' : null;
}
