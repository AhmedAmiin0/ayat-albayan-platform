import { describe, expect, it } from 'vitest';
import { planCommission, type PaymentFact, type SubscriptionFact } from './first-paid.js';
import { commissionKindOf, DEFAULT_RENEWAL_SHARE } from './kind.js';
import { planRenewalCommission } from './renewal.js';
import { subscriptionAlreadyStarted } from './started.js';

// Owner 2026-10-28: «If the course already started so dont give commission» (migration 20261028000942).
const CREATED = '2026-11-01T09:00:00Z'; // 12:00 in Riyadh, 2026-11-01
const pay = (amount: number): PaymentFact => ({ amount, kind: 'payment', paid_at: '2026-11-02T09:00:00Z' });
const sub = (id: string, over: Partial<SubscriptionFact> = {}): SubscriptionFact => ({
  id, price: 200, currency: 'SAR', created_at: CREATED, starts_on: '2026-11-01', payments: [pay(200)], ...over,
});
const ctx = { broughtBy: 'a1', broughtAt: '2026-10-02T08:00:00Z', tz: 'Asia/Riyadh',
  terms: { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' } } as const;
const renewal = (subscriptions: SubscriptionFact[], subscriptionId: string) =>
  planRenewalCommission({ ...ctx, share: DEFAULT_RENEWAL_SHARE, subscriptionId, subscriptions });

describe('subscriptionAlreadyStarted', () => {
  it('a first day before the Riyadh day of created_at, or lessons used before', () => {
    expect(subscriptionAlreadyStarted(sub('s', { starts_on: '2026-10-31' }))).toBe(true);
    expect(subscriptionAlreadyStarted(sub('s', { lessons_used_before: 1 }))).toBe(true);
    expect(subscriptionAlreadyStarted(sub('s', { lessons_used_before: 0 }))).toBe(false);
    expect(subscriptionAlreadyStarted(sub('s'))).toBe(false); // the same day
    expect(subscriptionAlreadyStarted(sub('s', { starts_on: '2026-11-05' }))).toBe(false); // a future start
  });
  it('the day of created_at is Riyadh\'s: 22:00 UTC is already the next day there', () => {
    expect(subscriptionAlreadyStarted(sub('s', { created_at: '2026-11-01T22:00:00Z' }))).toBe(true);
    expect(subscriptionAlreadyStarted(sub('s', { created_at: '2026-10-31T22:00:00Z' }))).toBe(false);
  });
  it('an unknown first day alone is not a start', () => {
    expect(subscriptionAlreadyStarted({ created_at: CREATED })).toBe(false);
  });
});

describe('no commission on a course that already started, of either kind', () => {
  it('a first package started yesterday earns no first; the same package starting today does', () => {
    expect(planCommission({ ...ctx, subscriptions: [sub('s1', { starts_on: '2026-10-31' })] })).toBeNull();
    expect(planCommission({ ...ctx, subscriptions: [sub('s1')] })).toMatchObject({ amount: 20, subscriptionId: 's1' });
    expect(planCommission({ ...ctx, subscriptions: [sub('s1', { starts_on: '2026-11-09' })] })).toMatchObject({ amount: 20 });
  });
  it('a renewal with lessons used before earns nothing; a future renewal earns', () => {
    const first = sub('s1', { created_at: '2026-10-20T09:00:00Z', starts_on: '2026-10-20' });
    expect(renewal([first, sub('s2', { lessons_used_before: 1 })], 's2')).toBeNull();
    expect(renewal([first, sub('s2', { starts_on: '2026-11-08' })], 's2')).toMatchObject({ amount: 10, share: 50 });
  });
  it('a started first still counts by order: the next package is a renewal, never a first', () => {
    const started = sub('s1', { created_at: '2026-10-20T09:00:00Z', starts_on: '2026-10-01' });
    const next = sub('s2');
    expect(commissionKindOf([started, next], 's2')).toBe('renewal');
    expect(planCommission({ ...ctx, subscriptions: [started, next] })).toBeNull();
    expect(renewal([started, next], 's2')).toMatchObject({ amount: 10 });
  });
});
