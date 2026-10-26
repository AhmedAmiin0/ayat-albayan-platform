// Test fixtures for the teacher-earnings screens (test-only). BALANCE and PAYMENT live in @ab/shared/testing (shared).
import type { TeacherEarningView } from '@ab/shared';

export { BALANCE, PAYMENT } from '@ab/shared/testing';

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

export const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
