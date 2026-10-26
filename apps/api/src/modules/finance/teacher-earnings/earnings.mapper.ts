import { outstanding, type TeacherEarningView, type TeacherPaymentView } from '@ab/shared';
import type { EarningRow, PaymentRow, SessionRow } from './earnings.queries';

const names = (row: SessionRow): string[] =>
  (row.lesson?.lesson_students ?? []).flatMap((s) => (s.student ? [s.student.name] : []));

export function toEarningView(row: EarningRow | SessionRow): TeacherEarningView {
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    starts_at: row.starts_at,
    minutes: row.minutes,
    rate: row.rate,
    amount: row.amount,
    paid_amount: row.paid_amount,
    outstanding: outstanding(row),
    currency: 'EGP',
    status: row.status,
    students: 'lesson' in row ? names(row) : [],
  };
}

export function toPaymentView(row: PaymentRow): TeacherPaymentView {
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    amount: row.amount,
    currency: 'EGP',
    method: row.method,
    paid_at: row.paid_at,
    note: row.note,
    has_receipt: row.receipt_path !== null,
    payout_id: row.payout_id,
    sessions: row.items.length,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
  };
}
