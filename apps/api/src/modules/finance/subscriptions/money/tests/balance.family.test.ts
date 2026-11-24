import type { StudentBalanceView, SubscriptionView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { toFamilyBalance } from '@/modules/finance/subscriptions/money/balance.family';

interface Pkg {
  id: string;
  total: number;
  used: number;
  price: number;
  paid: number;
  currency?: string;
  status?: string;
  cancel_kind?: string | null;
  stop_owed_amount?: number | null;
}

const pkg = (p: Pkg) =>
  ({
    id: p.id,
    price: p.price,
    paid: p.paid,
    currency: p.currency ?? 'SAR',
    status: p.status ?? 'active',
    cancel_kind: p.cancel_kind ?? null,
    stop_owed_amount: p.stop_owed_amount ?? null,
    fx_rate: 50,
    notes: 'سر',
    price_source: { total: p.price },
    balance: {
      subscription_id: p.id,
      lessons_total: p.total,
      lessons_used: p.used,
      remaining: p.total - p.used,
      ended_at: null,
      projected_end_at: null,
    },
  }) as unknown as SubscriptionView;

const view = (packages: SubscriptionView[], remaining: number): StudentBalanceView => ({
  student_id: 's1',
  remaining,
  current: packages.filter((p) => p.status !== 'cancelled').at(-1) ?? null,
  packages,
});

describe('toFamilyBalance (docs/50 §5: a reduction of the staff balance)', () => {
  it('sums lessons over live packages and what is owed in the current currency', () => {
    const packages = [
      pkg({ id: 'a', total: 8, used: 8, price: 290, paid: 290 }),
      pkg({ id: 'b', total: 12, used: 3, price: 400.1, paid: 100.05 }),
      pkg({ id: 'x', total: 4, used: 0, price: 99, paid: 0, status: 'cancelled', cancel_kind: 'unused' }),
    ];
    expect(toFamilyBalance(view(packages, 9))).toEqual({
      student_id: 's1',
      remaining: 9,
      lessons_total: 20,
      lessons_used: 11,
      amount_due: { amount: 300.05, currency: 'SAR' },
    });
  });

  it('a stopped course stays owed (its stored decision); another currency is left out', () => {
    const packages = [
      pkg({ id: 's', total: 8, used: 2, price: 290, paid: 50, status: 'cancelled', cancel_kind: 'stopped', stop_owed_amount: 80 }),
      pkg({ id: 'u', total: 8, used: 0, price: 40, paid: 0, currency: 'USD' }),
      pkg({ id: 'c', total: 4, used: 1, price: 145, paid: 45 }),
    ];
    const out = toFamilyBalance(view(packages, 3));
    expect(out.amount_due).toEqual({ amount: 130, currency: 'SAR' });
    expect(out.lessons_total).toBe(12);
  });

  it('never a negative remaining, null due without a package, and no money internals', () => {
    expect(toFamilyBalance(view([], 0))).toEqual({
      student_id: 's1', remaining: 0, lessons_total: 0, lessons_used: 0, amount_due: null,
    });
    const out = toFamilyBalance(view([pkg({ id: 'a', total: 4, used: 6, price: 145, paid: 145 })], -2));
    expect(out.remaining).toBe(0);
    expect(JSON.stringify(out)).not.toMatch(/price|paid|fx_rate|notes|quote/);
  });
});
