import type { StudentBalanceView, SubscriptionView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { toTeacherBalance } from './balance.teacher';

const pkg = (id: string, remaining: number) =>
  ({
    id,
    price: 145,
    paid: 145,
    currency: 'USD',
    fx_rate: 50,
    price_source: { total: 145 },
    balance: { subscription_id: id, lessons_total: 8, lessons_used: 8 - remaining, remaining, ended_at: null, projected_end_at: null },
  }) as unknown as SubscriptionView;

describe('toTeacherBalance (verifier: teachers never see money)', () => {
  it('keeps the lesson counts and drops price, paid, currency, fx and the quote', () => {
    const packages = [pkg('a', 0), pkg('b', 3)];
    const view = { student_id: 's1', remaining: 3, current: packages[1], packages } as unknown as StudentBalanceView;
    const out = toTeacherBalance(view);
    expect(out).toEqual({ student_id: 's1', remaining: 3, packages: packages.map((p) => p.balance) });
    expect(JSON.stringify(out)).not.toMatch(/price|paid|currency|fx_rate/);
  });
});
