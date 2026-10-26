import { describe, expect, it } from 'vitest';
import { computeCommission } from './commission.js';
import { planCommission, type PaymentFact, type SubscriptionFact } from './first-paid.js';
import { commissionKindOf, DEFAULT_RENEWAL_SHARE, RENEWAL_CUTOFF } from './kind.js';
import { planRenewalCommission } from './renewal.js';

const AFTER = '2026-11-02T09:00:00Z';
const pay = (amount: number, paid_at = AFTER): PaymentFact => ({ amount, kind: 'payment', paid_at });
const sub = (id: string, price: number, created_at: string): SubscriptionFact => ({ id, price, currency: 'SAR', created_at, payments: [] });
const paid = (s: SubscriptionFact, ...payments: PaymentFact[]): SubscriptionFact => ({ ...s, payments });
const PERCENT = { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' } as const;
const FIXED = { type: 'fixed', value: 30, currency: 'EGP', startsOn: '2026-10-01' } as const;
const ctx = { broughtBy: 'a1', broughtAt: '2026-10-02T08:00:00Z', terms: PERCENT, tz: 'Asia/Riyadh' } as const;
const renewal = (subscriptions: SubscriptionFact[], subscriptionId: string, over: Partial<Parameters<typeof planRenewalCommission>[0]> = {}) =>
  planRenewalCommission({ ...ctx, share: DEFAULT_RENEWAL_SHARE, subscriptionId, subscriptions, ...over });

describe('commissionKindOf: subscription ORDER decides, never payment order (rule 2)', () => {
  const trial = sub('t', 0, '2026-10-01T00:00:00Z');
  const one = sub('b', 200, '2026-10-03T00:00:00Z');
  const two = sub('a', 300, '2026-10-05T00:00:00Z');
  it('the earliest priced one is first, the later ones renewals; a trial never counts', () => {
    const subs = [two, trial, one];
    expect([commissionKindOf(subs, 't'), commissionKindOf(subs, 'b'), commissionKindOf(subs, 'a')]).toEqual([null, 'first', 'renewal']);
    expect(commissionKindOf(subs, 'missing')).toBeNull();
  });
  it('created at the same instant: the lower id comes first', () => {
    const same = [sub('b2', 100, '2026-10-03T00:00:00Z'), sub('a1', 100, '2026-10-03T00:00:00Z')];
    expect([commissionKindOf(same, 'a1'), commissionKindOf(same, 'b2')]).toEqual(['first', 'renewal']);
  });
});

describe('planRenewalCommission (rules 3-4)', () => {
  const first = paid(sub('s1', 200, '2026-10-03T00:00:00Z'), pay(200, '2026-10-04T09:00:00Z'));
  const second = paid(sub('s2', 300, '2026-10-20T00:00:00Z'), pay(300));
  it('half of the normal commission on the renewal price, in its currency; the share is kept on the plan', () => {
    expect(renewal([first, second], 's2')).toMatchObject({ amount: 15, currency: 'SAR', base: 300, share: 50, subscriptionId: 's2' });
    expect(planCommission({ ...ctx, subscriptions: [first, second] })).toMatchObject({ amount: 20, subscriptionId: 's1' });
  });
  it('fixed terms: the fixed amount x share, in the commission currency', () => {
    expect(renewal([first, second], 's2', { terms: FIXED })).toMatchObject({ amount: 15, currency: 'EGP' });
    expect(renewal([first, second], 's2', { terms: FIXED, share: 33 })).toMatchObject({ amount: 9.9 });
  });
  it('the first package is never a renewal; a renewal is never a second first', () => {
    expect(renewal([first, second], 's1')).toBeNull();
    expect(planCommission({ ...ctx, subscriptions: [sub('s1', 200, '2026-10-03T00:00:00Z'), second] })).toBeNull();
  });
  it('fully paid before the cutoff (2026-10-27 00:00 Riyadh): nothing; at the cutoff: earned', () => {
    const early = paid(sub('s2', 300, '2026-10-20T00:00:00Z'), pay(300, '2026-10-26T20:59:59Z'));
    expect(renewal([first, early], 's2')).toBeNull();
    expect(renewal([first, paid(sub('s2', 300, '2026-10-20T00:00:00Z'), pay(300, RENEWAL_CUTOFF))], 's2')?.amount).toBe(15);
  });
  it('an excluded subscription (seen fully paid before the cutoff, or merged) never earns, whatever its payments say now', () => {
    expect(renewal([first, second], 's2', { excluded: true })).toBeNull();
  });
  it('a subscription already holding a renewal row is never a first (no flip)', () => {
    const free = { ...first, price: 0 }; // the older one became free: the renewal is now first by order
    expect(planCommission({ ...ctx, subscriptions: [free, second] })?.subscriptionId).toBe('s2');
    expect(planCommission({ ...ctx, subscriptions: [free, second], renewalRowSubscriptionIds: ['s2'] })).toBeNull();
  });
  it('a late payment on the older package never changes the renewal (each row is its own)', () => {
    const unpaid = sub('s1', 200, '2026-10-03T00:00:00Z');
    const before = renewal([unpaid, second], 's2');
    expect(renewal([{ ...unpaid, payments: [pay(200, '2026-11-20T09:00:00Z')] }, second], 's2')).toEqual(before);
  });
  it('nothing without brought_by or terms, before the student was brought, at share 0 or not fully paid', () => {
    expect(renewal([first, second], 's2', { broughtBy: null })).toBeNull();
    expect(renewal([first, second], 's2', { terms: null })).toBeNull();
    expect(renewal([first, second], 's2', { broughtAt: '2026-11-05T08:00:00Z' })).toBeNull();
    expect(renewal([first, second], 's2', { share: 0 })).toBeNull();
    expect(renewal([first, paid(sub('s2', 300, '2026-10-20T00:00:00Z'), pay(299))], 's2')).toBeNull();
  });
});

describe('computeCommission with a share: one rounding, half up, like SQL round(price x rate/100 x share/100, 2)', () => {
  it('percent and fixed', () => {
    expect(computeCommission({ type: 'percent', value: 10, currency: null, base: 80.5, baseCurrency: 'USD', share: 50 })).toEqual({ amount: 4.03, currency: 'USD' });
    expect(computeCommission({ type: 'percent', value: 10, currency: null, base: 80.5, baseCurrency: 'USD' })).toEqual({ amount: 8.05, currency: 'USD' });
    expect(computeCommission({ type: 'fixed', value: 0.03, currency: 'EGP', base: 1, baseCurrency: 'SAR', share: 50 })).toEqual({ amount: 0.02, currency: 'EGP' });
    expect(computeCommission({ type: 'fixed', value: 30, currency: 'EGP', base: 1, baseCurrency: 'SAR', share: 101 })).toBeNull();
  });
});
