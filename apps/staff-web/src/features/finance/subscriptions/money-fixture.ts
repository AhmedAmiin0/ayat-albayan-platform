import { quote, type PaymentView, type PayoutView, type StudentBalanceView, type SubscriptionView } from '@ab/shared';

// Test fixtures for the money screens (the shapes the API returns, docs/11 §6–8).

export const WEEKLY: SubscriptionView = {
  id: 'sub-1',
  student: { id: 'stu-1', code: 'AB-0183', name: 'سهيلة' },
  package: '4',
  duration: 90,
  lessons_total: 4,
  price: 145,
  currency: 'SAR',
  fx_rate: null,
  fx_date: null,
  price_source: { ...quote({ tier: 'weekly', duration: 45, country: 'SA', students: 1, discount: 0 }), fx: null },
  starts_on: '2026-09-25',
  status: 'unpaid',
  renews_on: null,
  notes: null,
  paid: 0,
  balance: {
    subscription_id: 'sub-1',
    lessons_total: 4,
    lessons_used: 2,
    remaining: 2,
    ended_at: null,
    projected_end_at: '2026-10-09T15:00:00Z',
  },
  created_at: '2026-09-25T09:00:00Z',
};

export function balanceOf(packages: SubscriptionView[]): StudentBalanceView {
  return {
    student_id: 'stu-1',
    remaining: packages.reduce((n, p) => n + p.balance.remaining, 0),
    current: packages.at(-1) ?? null,
    packages,
  };
}

export const PAYMENT: PaymentView = {
  id: 'pay-1',
  subscription_id: 'sub-1',
  student: { id: 'stu-1', code: 'AB-0183', name: 'سهيلة' },
  amount: 145,
  currency: 'SAR',
  method: 'bank',
  paid_at: '2026-10-01T09:00:00Z',
  receipt_path: 'sub-1/r.jpg',
  recorded_by: { id: 'a1', full_name: 'مدير' },
  note: null,
  created_at: '2026-10-01T09:00:00Z',
  kind: 'payment',
  original: null,
  invoice_id: null,
};

export const PAYOUT: PayoutView = {
  id: 'po-1',
  teacher: { id: 't1', display_name_ar: 'أبرار' },
  month: '2026-09',
  lessons_count: 12,
  amount: 840,
  currency: 'EGP',
  status: 'draft',
  approved_at: null,
  paid_at: null,
  breakdown: { lines: [{ duration: 45, lessons: 12, rate: 70, amount: 840 }], lesson_ids: [], statuses: ['completed'] },
};
