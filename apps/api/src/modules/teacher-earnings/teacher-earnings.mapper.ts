import { DURATIONS, summarize, type Duration, type TeacherEarningsView, type TeacherEarningView, type TeacherPaymentView } from '@ab/shared';
import type { EarningRow, PaymentRow, TeacherRef } from './teacher-earnings.queries';

const minutesOf = (n: number | null): Duration => DURATIONS.find((d) => d === n) ?? DURATIONS[0];

/** v_teacher_earnings is a view, so every column is typed nullable; a row never has a null. */
export function toEarningView(row: EarningRow): TeacherEarningView {
  return {
    id: row.id ?? '',
    lesson_id: row.lesson_id ?? '',
    starts_at: row.starts_at ?? '',
    minutes: minutesOf(row.minutes),
    rate: Number(row.rate ?? 0),
    amount: Number(row.amount ?? 0),
    paid: Number(row.paid ?? 0),
    outstanding: Number(row.outstanding ?? 0),
    status: row.status ?? 'earned',
    currency: 'EGP',
  };
}

export function toEarningsView(teacher: TeacherRef, rows: readonly EarningRow[]): TeacherEarningsView {
  const sessions = rows.map(toEarningView);
  return { teacher, balance: summarize(sessions), sessions };
}

export function toPaymentView(row: PaymentRow): TeacherPaymentView {
  return {
    id: row.id,
    amount: Number(row.amount),
    paid_at: row.paid_at,
    method: row.method,
    note: row.note,
    has_receipt: row.receipt_path !== null,
    from_payout: row.payout_id !== null,
    sessions: row.items.length,
    currency: 'EGP',
  };
}
