// Test fixtures for the teacher-earnings screens (test-only).
import type { TeacherEarningsBalanceView, TeacherEarningView, TeacherPaymentView } from '@ab/shared';

export const BALANCE: TeacherEarningsBalanceView = {
  teacher: { id: 't1', display_name_ar: 'أبرار' },
  currency: 'EGP',
  earned: 210,
  paid: 100,
  outstanding: 110,
  overpaid: 0,
  sessions: 3,
  unpaid_sessions: 2,
};

const row = (n: number, patch: Partial<TeacherEarningView>): TeacherEarningView => ({
  id: `e${n}`,
  lesson_id: `l${n}`,
  starts_at: `2026-09-0${n}T10:00:00Z`,
  minutes: 45,
  rate: 70,
  amount: 70,
  paid_amount: 0,
  outstanding: 70,
  currency: 'EGP',
  status: 'earned',
  students: ['سهيلة'],
  ...patch,
});

export const SESSIONS: TeacherEarningView[] = [
  row(3, { amount: 50, rate: 50, minutes: 30, outstanding: 50 }),
  row(2, { amount: 90, rate: 90, minutes: 60, paid_amount: 30, outstanding: 60, status: 'partially_paid' }),
  row(1, { paid_amount: 70, outstanding: 0, status: 'paid' }),
];

export const PAYMENT: TeacherPaymentView = {
  id: 'p1',
  teacher_id: 't1',
  amount: 100,
  currency: 'EGP',
  method: 'bank',
  paid_at: '2026-10-01T09:00:00Z',
  note: 'دفعة أكتوبر',
  has_receipt: true,
  payout_id: null,
  sessions: 2,
  voided_at: null,
  void_reason: null,
};

export const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
