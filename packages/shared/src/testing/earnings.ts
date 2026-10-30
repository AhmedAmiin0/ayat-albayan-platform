import type { TeacherEarningsBalanceView, TeacherPaymentView } from '../money/ledger/earnings/earnings-views.js';

// Test-only teacher-earnings rows shared by the web and mobile tests (never imported by app code).

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
