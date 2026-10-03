import type { TeacherEarningView, TeacherEarningsView, TeacherPaymentView } from '@ab/shared';

// Test fixtures (not app code): a teacher with one paid, one part-paid and two unpaid sessions.
export const earning = (over: Partial<TeacherEarningView>): TeacherEarningView => ({
  id: 'e-1',
  lesson_id: 'l-1',
  starts_at: '2026-09-10T10:00:00Z',
  minutes: 45,
  rate: 70,
  amount: 70,
  paid: 0,
  outstanding: 70,
  status: 'earned',
  currency: 'EGP',
  ...over,
});

export const SESSIONS: TeacherEarningView[] = [
  earning({ id: 'e-4', starts_at: '2026-09-20T10:00:00Z' }),
  earning({ id: 'e-3', starts_at: '2026-09-15T10:00:00Z', paid: 30, outstanding: 40, status: 'partially_paid' }),
  earning({ id: 'e-2', starts_at: '2026-09-12T10:00:00Z', paid: 70, outstanding: 0, status: 'paid' }),
  earning({ id: 'e-1', starts_at: '2026-09-10T10:00:00Z' }),
];

export const EARNINGS: TeacherEarningsView = {
  teacher: { id: 't-1', display_name_ar: 'أبرار' },
  balance: { earned: 280, paid: 100, outstanding: 180, sessions: 4, open_sessions: 3, currency: 'EGP' },
  sessions: SESSIONS,
};

export const PAYMENTS: TeacherPaymentView[] = [
  { id: 'p-2', amount: 100, paid_at: '2026-09-25T10:00:00Z', method: 'bank', note: null, has_receipt: true, from_payout: false, sessions: 2, currency: 'EGP' },
  { id: 'p-1', amount: 50, paid_at: '2026-09-01T10:00:00Z', method: 'cash', note: null, has_receipt: false, from_payout: true, sessions: 1, currency: 'EGP' },
];
