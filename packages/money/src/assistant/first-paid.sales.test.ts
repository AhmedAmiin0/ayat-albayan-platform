import { describe, expect, it } from 'vitest';
import { planCommission, type PaymentFact, type SubscriptionFact } from './first-paid.js';

// Owner 2026-10-12: the salesperson records the family's bank transfer herself (POST /sales/payments). The
// commission (migration 272 trigger, twin planCommission) reads only the payments, never who recorded them,
// so her own transfer that completes the first package earns her commission exactly as an admin's would.

const TERMS = { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' } as const;
const bank = (amount: number, paid_at: string): PaymentFact => ({ amount, kind: 'payment', paid_at });
const pkg = (payments: PaymentFact[]): SubscriptionFact => ({ id: 'p1', price: 290, currency: 'SAR', created_at: '2026-10-12T08:00:00Z', payments });
const plan = (subscriptions: SubscriptionFact[]) =>
  planCommission({ broughtBy: 'sales-a', broughtAt: '2026-10-05T10:00:00Z', terms: TERMS, tz: 'Asia/Riyadh', subscriptions });

describe('commission after a transfer the salesperson recorded from the chat', () => {
  it('her full bank transfer on the trial student’s first package earns 10 percent once', () => {
    expect(plan([pkg([bank(290, '2026-10-12T09:00:00Z')])])).toMatchObject({ subscriptionId: 'p1', amount: 29, currency: 'SAR', fullAt: '2026-10-12T09:00:00Z' });
  });

  it('a partial transfer earns nothing yet; the one that completes the price earns it', () => {
    expect(plan([pkg([bank(100, '2026-10-12T09:00:00Z')])])).toBeNull();
    expect(plan([pkg([bank(100, '2026-10-12T09:00:00Z'), bank(190, '2026-10-13T09:00:00Z')])])).toMatchObject({ fullAt: '2026-10-13T09:00:00Z' });
  });
});
