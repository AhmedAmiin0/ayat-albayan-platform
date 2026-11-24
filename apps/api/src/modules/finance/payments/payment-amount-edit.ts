import type { TablesUpdate } from '@ab/db';
import { amountEditProblem, amountFromStripe, type PaymentUpdate } from '@ab/shared';
import { conflict } from '@/common/http/errors';
import type { PaymentRow, PaymentsRepo } from './payments.repo';

/** Same amount is never refused; card amounts and methods are locked; net paid stays >= 0. */
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
 * The other fields first, then the amount last (one locked transaction, migration
 * 20261105001000: two edits can never both pass the net check; a converted transfer's original
 * amount and rate go, the audit keeps them). The row after, or `before` when nothing changed.
 */
export async function writePayment(
  payments: Pick<PaymentsRepo, 'setAmount' | 'update'>,
  before: PaymentRow,
  change: { amount: number | null; write: TablesUpdate<'payments'> },
): Promise<PaymentRow> {
  const rest = Object.keys(change.write).length > 0;
  const updated = rest ? await payments.update(before.id, change.write) : before;
  const amount = { amount: change.amount ?? before.amount, expected: before.amount };
  return change.amount === null ? updated : payments.setAmount(before.id, amount);
}
