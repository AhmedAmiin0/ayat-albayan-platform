import {
  quote,
  type PaymentView,
  type StudentBalanceView,
  type SubscriptionView,
} from '@ab/shared';

// Test-only API answers in the docs/11 shapes. The package is e2e/support/money.ts's: the weekly
// catalog package for Saudi Arabia (4 lessons, priced by the shared quote, not typed here).

export const STUDENT = { id: 's1', code: 'AB-0183', name: 'هدى' };
export const SUB_ID = '6f1c2a8e-3b4d-4e5f-9a0b-1c2d3e4f5a6b';
export const OLD_SUB_ID = '0a9b8c7d-6e5f-4a3b-8c1d-2e3f4a5b6c7d';

const weekly = { ...quote({ tier: 'weekly', duration: 45, country: 'SA', students: 1, discount: 0 }), fx: null };

export function subscription(over: Partial<SubscriptionView> = {}): SubscriptionView {
  const id = over.id ?? SUB_ID;
  return {
    id,
    student: STUDENT,
    package: '4',
    duration: 90,
    lessons_total: weekly.lessons,
    price: weekly.afterDiscount,
    currency: weekly.currency,
    fx_rate: null,
    fx_date: null,
    price_source: weekly,
    starts_on: '2026-09-24',
    status: 'unpaid',
    renews_on: null,
    notes: null,
    paid: 0,
    balance: {
      subscription_id: id,
      lessons_total: weekly.lessons,
      lessons_used: 2,
      remaining: 2,
      ended_at: null,
      projected_end_at: null,
    },
    created_at: '2026-09-24T08:00:00.000Z',
    ...over,
  };
}

/** GET /students/:id/balance over these packages, oldest first; the last is `current`. */
export function balanceOf(...packages: SubscriptionView[]): StudentBalanceView {
  return {
    student_id: STUDENT.id,
    remaining: packages.reduce((sum, p) => sum + p.balance.remaining, 0),
    current: packages.at(-1) ?? null,
    packages,
  };
}

export function payment(over: Partial<PaymentView> = {}): PaymentView {
  return {
    id: 'p1',
    subscription_id: SUB_ID,
    student: STUDENT,
    amount: 145,
    currency: 'SAR',
    method: 'bank',
    paid_at: '2026-09-29T09:00:00.000Z',
    receipt_path: null,
    recorded_by: { id: 'u1', full_name: 'الإدارة' },
    note: null,
    created_at: '2026-09-29T09:05:00.000Z',
    ...over,
  };
}

export const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 5 });
