import { describe, expect, it } from 'vitest';
import { firstFullyPaid, localDay, planCommission, subscriptionFullAt, type PaymentFact, type SubscriptionFact } from './first-paid.js';

const pay = (amount: number, paid_at: string, kind: PaymentFact['kind'] = 'payment'): PaymentFact => ({ amount, kind, paid_at });
const sub = (id: string, price: number, payments: PaymentFact[]): SubscriptionFact =>
  ({ id, price, currency: 'SAR', created_at: '2026-09-01T00:00:00Z', payments });
const TERMS = { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' } as const;
const plan = (subscriptions: SubscriptionFact[], over: Partial<Parameters<typeof planCommission>[0]> = {}) =>
  planCommission({ broughtBy: 'a1', terms: TERMS, tz: 'Asia/Riyadh', subscriptions, ...over });

describe('subscriptionFullAt (twin of subscription_full_at)', () => {
  it('is null until the net paid reaches the price, then the date of the completing payment', () => {
    const payments = [pay(100, '2026-10-01T10:00:00Z'), pay(150, '2026-10-05T10:00:00Z'), pay(20, '2026-10-09T10:00:00Z')];
    expect(subscriptionFullAt({ price: 250, payments: payments.slice(0, 1) })).toBeNull();
    expect(subscriptionFullAt({ price: 250, payments })).toBe('2026-10-05T10:00:00Z');
  });

  it('counts a refund against it and moves the date when it is paid again', () => {
    const base = [pay(250, '2026-10-01T10:00:00Z')];
    expect(subscriptionFullAt({ price: 250, payments: [...base, pay(50, '2026-10-02T10:00:00Z', 'refund')] })).toBeNull();
    expect(
      subscriptionFullAt({ price: 250, payments: [...base, pay(50, '2026-10-02T10:00:00Z', 'refund'), pay(50, '2026-10-03T10:00:00Z')] }),
    ).toBe('2026-10-03T10:00:00Z');
  });

  it('is exact to the cent and never full for a free package', () => {
    expect(subscriptionFullAt({ price: 0.3, payments: [pay(0.1, '2026-10-01T00:00:00Z'), pay(0.2, '2026-10-02T00:00:00Z')] })).toBe('2026-10-02T00:00:00Z');
    expect(subscriptionFullAt({ price: 0, payments: [pay(10, '2026-10-01T00:00:00Z')] })).toBeNull();
    expect(subscriptionFullAt({ price: 100, payments: [] })).toBeNull();
  });

  it('orders by paid_at, not by the order the rows arrive in', () => {
    const late = pay(100, '2026-10-04T00:00:00Z');
    const early = pay(100, '2026-10-02T00:00:00Z');
    expect(subscriptionFullAt({ price: 200, payments: [late, early] })).toBe('2026-10-04T00:00:00Z');
  });
});

describe('firstFullyPaid: only the first subscription to be paid counts', () => {
  const a = sub('a', 100, [pay(100, '2026-10-05T00:00:00Z')]);
  const b = { ...sub('b', 100, [pay(100, '2026-10-02T00:00:00Z')]), created_at: '2026-09-20T00:00:00Z' };
  it('picks the earliest fully paid date, not the earliest created', () => {
    expect(firstFullyPaid([a, b])?.subscription.id).toBe('b');
  });
  it('is null when none is fully paid', () => {
    expect(firstFullyPaid([sub('c', 100, [pay(50, '2026-10-02T00:00:00Z')])])).toBeNull();
  });
});

describe('localDay', () => {
  it('uses the time zone of the person, not UTC', () => {
    expect(localDay('2026-10-05T22:30:00Z', 'Asia/Riyadh')).toBe('2026-10-06');
    expect(localDay('2026-10-05T22:30:00Z', 'UTC')).toBe('2026-10-05');
  });
});

describe('planCommission (twin of evaluate_assistant_commission)', () => {
  const paid = (price: number, at: string, over: Partial<SubscriptionFact> = {}) => ({ ...sub('s1', price, [pay(price, at)]), ...over });

  it('percent of the price on the first fully paid subscription', () => {
    expect(plan([paid(250, '2026-10-05T10:00:00Z')])).toMatchObject({ amount: 25, currency: 'SAR', subscriptionId: 's1', base: 250 });
  });

  it('a second subscription earns nothing once the first was paid', () => {
    const second = paid(400, '2026-10-20T10:00:00Z', { id: 's2' });
    expect(plan([paid(250, '2026-10-05T10:00:00Z'), second])?.subscriptionId).toBe('s1');
  });

  it('is nothing before commission_starts_on, in the assistant tz', () => {
    expect(plan([paid(250, '2026-09-30T10:00:00Z')])).toBeNull();
    expect(plan([paid(250, '2026-09-30T21:30:00Z')])?.amount).toBe(25); // 00:30 on 1 Oct in Riyadh
  });

  it('is nothing without brought_by, without terms, or for a free package', () => {
    const s = [paid(250, '2026-10-05T10:00:00Z')];
    expect(plan(s, { broughtBy: null })).toBeNull();
    expect(plan(s, { terms: null })).toBeNull();
    expect(plan([paid(0, '2026-10-05T10:00:00Z')])).toBeNull();
  });

  it('a fixed commission keeps its own currency', () => {
    const fixed = { type: 'fixed', value: 30, currency: 'EGP', startsOn: '2026-10-01' } as const;
    expect(plan([paid(100, '2026-10-05T10:00:00Z', { currency: 'USD' })], { terms: fixed })).toMatchObject({ amount: 30, currency: 'EGP', baseCurrency: 'USD' });
  });
});
