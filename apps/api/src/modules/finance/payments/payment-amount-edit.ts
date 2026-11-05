import type { TablesUpdate } from '@ab/db';
import { amountEditProblem, amountFromStripe, type PaymentUpdate } from '@ab/shared';
import { conflict } from '@/common/http/errors';
import type { PaymentRow, PaymentsRepo } from './payments.repo';

/**
 * «تعديل المبلغ» (owner 2026-11-02), the admin's PATCH and the assistant's alike: the new
 * amount, or null when unchanged. The same amount (the admin's form re-sends it) is never
 * refused. A card payment's amount is Stripe's: 409 stripe_amount_locked. The package's net
 * paid may not go below 0 (409 refund_exceeds_paid: checked here for a quick answer, and again
 * under a lock by PaymentsRepo.setAmount, which writes it). A method may never switch into or
 * out of card (409 stripe_method_locked): that would unlock (or fake) a Stripe amount.
 */
export async function amountChange(
  payments: Pick<PaymentsRepo, 'netPaid'>,
  before: PaymentRow,
  patch: Partial<Pick<PaymentUpdate, 'amount' | 'method'>>,
): Promise<number | null> {
  const { amount, method } = patch;
  if (method !== undefined && amountFromStripe(method) !== amountFromStripe(before.method))
    throw conflict('stripe_method_locked');
  if (amount === undefined || amount === before.amount) return null;
  const netPaid = await payments.netPaid(before.subscription_id);
  const problem = amountEditProblem(before, { amount, netPaid });
  if (problem) throw conflict(problem);
  return amount;
}

/**
 * The amount first (one locked transaction, migration 20261105001000: two edits can never
 * both pass the net check; a converted transfer's original amount and rate go, the audit keeps
 * them), then the other fields. The row after, or `before` when nothing changed.
 */
export async function writePayment(
  payments: Pick<PaymentsRepo, 'setAmount' | 'update'>,
  before: PaymentRow,
  change: { amount: number | null; write: TablesUpdate<'payments'> },
): Promise<PaymentRow> {
  const amount = { amount: change.amount ?? before.amount, expected: before.amount };
  const set = change.amount === null ? before : await payments.setAmount(before.id, amount);
  const rest = Object.keys(change.write).length > 0;
  return rest ? payments.update(before.id, change.write) : set;
}
