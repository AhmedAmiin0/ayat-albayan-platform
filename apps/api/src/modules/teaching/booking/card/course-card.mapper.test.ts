import type { SubscriptionView } from '@ab/money';
import { describe, expect, it } from 'vitest';
import { toCardPackage } from './course-card.mapper';

const sub = (over: Partial<SubscriptionView> = {}) =>
  ({
    id: 'p1',
    status: 'cancelled',
    lessons_total: 8,
    paid: 240,
    price: 240,
    currency: 'SAR',
    cancel_kind: 'stopped',
    stop_owed_amount: 90,
    balance: { lessons_used: 9, remaining: -1, projected_end_at: null },
    ...over,
  }) as SubscriptionView;

describe('toCardPackage', () => {
  it('a stopped course owes its stored decision; what is left is never below 0', () => {
    const pkg = toCardPackage({ packages: [sub()] }, 'p1');
    expect(pkg).toMatchObject({ status: 'cancelled', used: 9, left: 0, paid: 240, owed: 90 });
  });

  it('a package the balance does not list: null', () => {
    expect(toCardPackage({ packages: [sub()] }, 'other')).toBeNull();
  });
});
