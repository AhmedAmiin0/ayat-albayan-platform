import type { TablesUpdate } from '@ab/db';
import { amountEditProblem } from '@ab/shared';
import { conflict } from '@/common/http/errors';
import type { PaymentRow, PaymentsRepo } from './payments.repo';

/**
 * «تعديل المبلغ» (owner 2026-11-02), the admin's PATCH and the assistant's alike: what a new amount
 * writes. The same amount (the admin's form re-sends it) writes nothing and is never refused. A
 * card payment's amount is Stripe's: 409 stripe_amount_locked. The package's net paid may not go
 * below 0 (409 refund_exceeds_paid). The typed amount is in the package's currency, so a converted
 * transfer's original amount and rate go (they no longer describe it); the audit keeps them.
 */
export async function amountWrite(
  payments: Pick<PaymentsRepo, 'netPaid'>,
  before: PaymentRow,
  amount: number | undefined,
): Promise<TablesUpdate<'payments'>> {
  if (amount === undefined || amount === before.amount) return {};
  const netPaid = await payments.netPaid(before.subscription_id);
  const problem = amountEditProblem(before, { amount, netPaid });
  if (problem) throw conflict(problem);
  return { amount, original_amount: null, original_currency: null, fx_rate: null };
}
