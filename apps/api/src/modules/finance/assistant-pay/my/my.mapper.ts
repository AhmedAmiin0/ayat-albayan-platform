import type { Enums, Tables } from '@ab/db';
import type { MyPaymentRow, MyStudentRow } from '@ab/shared';

/** v_assistant_students, the columns the assistant's own list uses. */
export interface MyStudentSource {
  student_id: string | null;
  code: string | null;
  name: string | null;
  brought_at: string | null;
  first_subscription_paid: boolean | null;
  commission_id: string | null;
  commission_status: Enums<'assistant_commission_status'> | null;
  commission_amount: number | null;
  commission_currency: string | null;
  commission_earned_at: string | null;
}

export const MY_STUDENT_COLUMNS =
  'student_id, code, name, brought_at, first_subscription_paid, commission_id, commission_status, commission_amount, commission_currency, commission_earned_at';

/** A whitelist: no price, no subscription, no guardian. Only whether the first subscription is paid, and the commission. */
export function toMyStudent(r: MyStudentSource): MyStudentRow | null {
  if (!r.student_id || !r.brought_at) return null;
  const { commission_status: status, commission_currency: currency, commission_earned_at: earnedAt } = r;
  return {
    id: r.student_id,
    code: r.code ?? '',
    name: r.name ?? '',
    brought_at: r.brought_at,
    first_subscription_paid: r.first_subscription_paid === true,
    commission:
      r.commission_id && status && currency && earnedAt
        ? { amount: Number(r.commission_amount), currency, status, earned_at: earnedAt }
        : null,
  };
}

export type MyPaymentSource = Pick<Tables<'payments'>, 'id' | 'kind' | 'amount' | 'currency' | 'method' | 'paid_at' | 'note'> & {
  subscription: { student: { id: string; code: string | null; name: string } | null } | null;
};

/** What the payment's select asks for: never the subscription's price, fx or notes. */
export const MY_PAYMENT_SELECT = 'id, kind, amount, currency, method, paid_at, note, subscription:subscriptions(student:students(id, code, name))';

export function toMyPayment(r: MyPaymentSource): MyPaymentRow {
  const s = r.subscription?.student;
  return {
    id: r.id,
    student: { id: s?.id ?? '', code: s?.code ?? '', name: s?.name ?? '' },
    kind: r.kind,
    amount: Number(r.amount),
    currency: r.currency,
    method: r.method,
    paid_at: r.paid_at,
    note: r.note,
  };
}
