import { describe, expect, it } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { toSubscriptionView } from '@/modules/finance/subscriptions/subscriptions.mapper';
import { toSalesSubscription } from './sales-money.mapper';

// Owner 2026-11-06: every API money reader uses owedFor: a stopped course owes its stored decision.
const view = (patch: Parameters<typeof subRow>[0], paid: number) =>
  toSubscriptionView(subRow(patch), { balances: new Map(), paid: new Map([['5b000000-0000-4000-8000-000000000001', paid]]) });
const stopped = { status: 'cancelled' as const, cancel_kind: 'stopped', price: 400 };

describe('API mappers: the owed rule (owedFor)', () => {
  it('the subscription view carries stop_owed_amount as a number (null when not stopped)', () => {
    expect(view({ ...stopped, stop_owed_amount: 150 }, 0).stop_owed_amount).toBe(150);
    expect(view({ price: 400 }, 0).stop_owed_amount).toBeNull();
  });

  it('sales due: a stopped course owes its decision minus net paid, never price − paid', () => {
    expect(toSalesSubscription(view({ ...stopped, stop_owed_amount: 150 }, 100)).due).toBe(50);
    expect(toSalesSubscription(view({ ...stopped, stop_owed_amount: 100 }, 100)).due).toBe(0);
    expect(toSalesSubscription(view({ price: 400, status: 'active' }, 100)).due).toBe(300);
  });

  it('an unused cancel is never owed', () => {
    const unused = { status: 'cancelled' as const, cancel_kind: 'unused', price: 400 };
    expect(toSalesSubscription(view(unused, 0)).due).toBe(0);
  });
});
