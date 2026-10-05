import type { PaymentView } from '@ab/shared';
import { studentRef } from '../subscriptions/subscriptions.mapper';
import type { PaymentRow } from './payments.queries';

/** payments row (+ its package's student) → PaymentView. */
export function toPaymentView(row: PaymentRow, recorders: ReadonlyMap<string, string>): PaymentView {
  const recorder = row.recorded_by === null ? undefined : recorders.get(row.recorded_by);
  return {
    id: row.id,
    subscription_id: row.subscription_id,
    student: studentRef(row.subscription?.student ?? null, row.subscription?.student_id ?? ''),
    amount: Number(row.amount),
    currency: row.currency,
    method: row.method,
    paid_at: row.paid_at,
    receipt_path: row.receipt_path,
    recorded_by:
      row.recorded_by !== null && recorder !== undefined ? { id: row.recorded_by, full_name: recorder } : null,
    note: row.note,
    created_at: row.created_at,
    kind: row.kind,
    original:
      row.original_amount !== null && row.original_currency !== null && row.fx_rate !== null
        ? { amount: Number(row.original_amount), currency: row.original_currency, fx_rate: Number(row.fx_rate) }
        : null,
    invoice_id: row.invoice_id,
  };
}
