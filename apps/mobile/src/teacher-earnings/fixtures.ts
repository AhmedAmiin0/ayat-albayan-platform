import type { TeacherEarningsView, TeacherEarningView, TeacherPaymentView } from '@ab/shared';
import { summarize } from '@ab/shared';

// Test-only API answers in the TeacherEarningsView / TeacherPaymentView shapes.

export const TEACHER = { id: 't1', display_name_ar: 'أ. فاطمة' };

export function earning(over: Partial<TeacherEarningView> & Pick<TeacherEarningView, 'id'>): TeacherEarningView {
  const amount = over.amount ?? 100;
  const paid = over.paid ?? 0;
  return {
    lesson_id: `l-${over.id}`,
    starts_at: '2026-09-20T10:00:00.000Z',
    minutes: 45,
    rate: amount,
    amount,
    paid,
    outstanding: Math.max(0, amount - paid),
    status: paid === 0 ? 'earned' : paid >= amount ? 'paid' : 'partially_paid',
    currency: 'EGP',
    ...over,
  };
}

/** Newest first: e3 (open, 100), e2 (partly paid, 30 of 80 → 50 due), e1 (settled). */
export const SESSIONS: TeacherEarningView[] = [
  earning({ id: 'e3', starts_at: '2026-09-22T10:00:00.000Z', amount: 100 }),
  earning({ id: 'e2', starts_at: '2026-09-21T10:00:00.000Z', amount: 80, paid: 30, minutes: 30 }),
  earning({ id: 'e1', starts_at: '2026-09-20T10:00:00.000Z', amount: 60, paid: 60, minutes: 60 }),
];

export function earningsView(sessions: TeacherEarningView[] = SESSIONS): TeacherEarningsView {
  return { teacher: TEACHER, balance: summarize(sessions), sessions };
}

export const PAYMENTS: TeacherPaymentView[] = [
  {
    id: 'p1',
    amount: 90,
    paid_at: '2026-09-25T10:00:00.000Z',
    method: 'cash',
    note: 'دفعة أولى',
    has_receipt: false,
    from_payout: false,
    sessions: 2,
    currency: 'EGP',
  },
];
