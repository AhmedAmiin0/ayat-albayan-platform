import { describe, expect, it } from 'vitest';
import type { SubscriptionFact } from './first-paid.js';
import { planRenewalCommission, renewalShareNow } from './renewal.js';

// «عمولة التجديد» off (owner 2026-11-01, migration 20261101000996): a new renewal earns nothing;
// the percent is kept.
interface At {
  created: string;
  paid: string;
}
const sub = (id: string, price: number, at: At): SubscriptionFact => ({
  id, price, currency: 'SAR', created_at: at.created, payments: [{ amount: price, kind: 'payment', paid_at: at.paid }],
});
const subs = [
  sub('s1', 200, { created: '2026-10-03T00:00:00Z', paid: '2026-10-04T09:00:00Z' }),
  sub('s2', 300, { created: '2026-10-28T00:00:00Z', paid: '2026-11-02T09:00:00Z' }),
];
const terms = { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' } as const;
const plan = (share: number) =>
  planRenewalCommission({ broughtBy: 'a1', broughtAt: '2026-10-02T08:00:00Z', terms, tz: 'Asia/Riyadh', share, subscriptionId: 's2', subscriptions: subs });

const now = (enabled: boolean, percent: number) =>
  renewalShareNow({ renewal_commission_enabled: enabled, renewal_commission_percent: percent });

describe('renewalShareNow (the share a new renewal earns now, for the screens)', () => {
  it('on: the percent; off: 0 whatever the percent', () => {
    expect([now(true, 50), now(true, 0), now(false, 80)]).toEqual([50, 0, 0]);
  });

  it('off plans no renewal commission; on plans the share', () => {
    expect(plan(now(false, 50))).toBeNull();
    expect(plan(now(true, 50))).toMatchObject({ amount: 15, share: 50 });
  });
});
