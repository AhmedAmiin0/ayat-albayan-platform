import { describe, expect, it } from 'vitest';
import { toPaymentView } from '../../finance/payments/payments.mapper';
import { paymentRow, subRow, WEEKLY_SA } from '../../finance/subscriptions/money/money.fakes';
import { toSalesPayment, toSalesQuote, toSalesSubscription } from './sales-money.mapper';
import type { SubscriptionView } from '@ab/shared';

const view = (patch: Partial<SubscriptionView> = {}): SubscriptionView => ({
  ...subRow(),
  student: { id: 's1', code: 'AB-0183', name: 'سهيلة' },
  package: '4',
  duration: 90,
  price_source: WEEKLY_SA,
  notes: 'ملاحظة داخلية',
  fx_rate: 3.75,
  paid: 45.5,
  balance: { subscription_id: 'x', lessons_total: 4, lessons_used: 0, remaining: 4, ended_at: null, projected_end_at: null },
  ...patch,
} as SubscriptionView);

describe('sales money whitelists: explicit keys, never the admin view spread', () => {
  it('a subscription keeps price, paid and due, never notes, fx or the quote source', () => {
    const s = toSalesSubscription(view());
    expect(Object.keys(s).sort()).toEqual(['currency', 'due', 'duration', 'id', 'lessons_total', 'package', 'paid', 'price', 'starts_on', 'status', 'student']);
    expect(s.due).toBe(99.5);
  });

  it('due never goes below zero (an overpaid package)', () => {
    expect(toSalesSubscription(view({ paid: 200 })).due).toBe(0);
  });

  it('a payment keeps what she recorded and the student status, never the recorder, receipt path or fx original', () => {
    const p = toSalesPayment(toPaymentView(paymentRow({ original_amount: 10, original_currency: 'USD', fx_rate: 3.75 }), new Map()), 'active');
    expect(Object.keys(p).sort()).toEqual(['amount', 'created_at', 'currency', 'id', 'kind', 'method', 'note', 'paid_at', 'student', 'subscription_id']);
    expect(p.student).toEqual({ id: '5a000000-0000-4000-8000-000000000001', code: 'AB-0183', name: 'سهيلة', status: 'active' });
  });

  it('a quote keeps the price to transfer, never the fx rate, provider or country', () => {
    const q = toSalesQuote({ ...WEEKLY_SA, fx: { quote: 'USD', rate: 3.75, date: null, provider: 'peg', fallback: true, ageHours: null } });
    expect(Object.keys(q).sort()).toEqual(['afterDiscount', 'currency', 'discount', 'duration', 'lessons', 'package', 'perLesson']);
  });
});
