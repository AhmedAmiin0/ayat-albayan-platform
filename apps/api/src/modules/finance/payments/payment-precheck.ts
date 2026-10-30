import type { PaymentWrite } from '@ab/shared';
import { conflict } from '../../../common/http/errors';
import type { CheckedAttachment } from './attachments/payment-attachments.service';
import type { Converted, PaymentInputs } from './payment-inputs';
import type { PaymentRow, PaymentsQueries, PaymentSubscription } from './payments.queries';

/** A cancelled package's money is frozen (owner 2026-10-28: it stays net 0; migration 934 refuses it too). */
export function notCancelled(row: PaymentRow): PaymentRow {
  if (row.subscription?.status === 'cancelled') throw conflict('subscription_cancelled');
  return row;
}

export type Prechecked = { files: CheckedAttachment[]; converted: Converted };

/**
 * Every check a new payment passes before its insert (not a cancelled package, the form's files, the invoice and whether it is
 * already used, the conversion, the refund cap). PaymentsService runs it inside one try: a refusal
 * here may only mean a racing send of the same form booked it first, so it replays when that payment exists.
 */
export async function precheckPayment(
  deps: { payments: PaymentsQueries; inputs: PaymentInputs },
  v: { input: PaymentWrite; sub: PaymentSubscription },
): Promise<Prechecked> {
  const { input, sub } = v;
  // A cancelled package (owner 2026-10-28) takes no money; migration 934 refuses the row too.
  if (sub.status === 'cancelled') throw conflict('subscription_cancelled');
  const files = await deps.inputs.files.check(sub.id, input);
  if (input.invoiceId) await deps.inputs.checkInvoice(input.invoiceId, sub.student_id);
  if (input.invoiceId && (await deps.payments.byInvoice(input.invoiceId))) throw conflict('invoice_used');
  const converted = await deps.inputs.convert(input, sub);
  if (input.kind === 'refund' && converted.amount > (await deps.payments.netPaid(sub.id))) throw conflict('refund_exceeds_paid');
  return { files, converted };
}
