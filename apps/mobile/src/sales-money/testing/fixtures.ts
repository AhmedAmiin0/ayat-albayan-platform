import type { MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';

// Test data shaped like GET /sales/me/* (the web's MyEarnings / MyStudents / MyPayments tests).

export const earnings = (over: Partial<MyEarnings> = {}): MyEarnings => ({
  terms: {
    assistant_id: 'a1',
    commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-10-01' },
    salary: { amount: 3000, currency: 'EGP', starts_on: '2026-10-01' },
    renewal_share_percent: 50,
  },
  this_month: {
    EGP: { salary: 3000, commissions: 0, adjustments: 0, total: 3000 },
    SAR: { salary: 0, commissions: 25, adjustments: 0, total: 25 },
  },
  commissions_total: { SAR: 75, EGP: 40 },
  statements: [
    {
      id: 'st1',
      assistant: { id: 'a1', name: 'الزهراء' },
      month: '2026-09-01',
      status: 'paid',
      totals: { EGP: { salary: 3000, commissions: 40, adjustments: -10, total: 3030 } },
      lines: [
        { kind: 'salary', amount: 3000, currency: 'EGP', student: null, reason: null, commission_kind: null },
        { kind: 'commission', amount: 40, currency: 'EGP', student: { code: 'AB-1001', name: 'سهيلة' }, reason: null, commission_kind: 'first' },
        { kind: 'adjustment', amount: -10, currency: 'EGP', student: null, reason: 'تصحيح', commission_kind: null },
      ],
      approved_at: '2026-10-01T09:00:00Z',
      paid_at: '2026-10-03T09:00:00Z',
      method: 'bank',
      note: null,
      has_receipt: false,
    },
  ],
  ...over,
});

export const myStudent = (over: Partial<MyStudentRow> = {}): MyStudentRow => ({
  id: 's1',
  code: 'AB-1001',
  name: 'سهيلة',
  brought_at: '2026-10-02T10:00:00Z',
  first_subscription_paid: true,
  commission: { amount: 50, currency: 'SAR', status: 'earned', earned_at: '2026-10-03T10:00:00Z' },
  renewal_commissions: 0,
  ...over,
});

export const myPayment = (over: Partial<MyPaymentRow> = {}): MyPaymentRow => ({
  id: 'p1',
  student: { id: 's1', code: 'AB-1001', name: 'سهيلة' },
  kind: 'payment',
  amount: 500,
  currency: 'SAR',
  method: 'bank',
  paid_at: '2026-10-03T10:00:00Z',
  note: 'دفعة أولى',
  ...over,
});
