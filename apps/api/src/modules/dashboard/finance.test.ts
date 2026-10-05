import { describe, expect, it } from 'vitest';
import type { Conversion } from './conversion';
import { financeTotals, type FinanceFacts } from './finance';

// 1 SAR = 13 EGP; USD has no rate stored.
const SAR: Conversion = { currency: 'SAR', rates: { SAR: 1, EGP: 13 }, missing: ['USD'], date: '2026-10-01T00:00:00Z' };
const facts = (over: Partial<FinanceFacts> = {}): FinanceFacts => ({
  conversion: SAR,
  months: ['2026-09', '2026-10'],
  payments: [],
  costs: [],
  expenses: [],
  ...over,
});

describe('financeTotals (R-RPT-02)', () => {
  it('revenue, teacher cost and expenses per month and in total, margin = revenue − cost − expenses', () => {
    const t = financeTotals(
      facts({
        payments: [
          { amount: 145, currency: 'SAR', month: '2026-09', source: 'facebook_ad' },
          { amount: 290, currency: 'SAR', month: '2026-10', source: 'referral' },
        ],
        costs: [{ amount: 130, currency: 'EGP', month: '2026-10', sources: ['referral'] }],
        expenses: [{ amount: 1300, currency: 'EGP', month: '2026-09', category: 'ads' }],
      }),
    );
    expect(t.by_month).toEqual([
      { month: '2026-09', revenue: 145, teacher_cost: 0, expenses: 100, gross_margin: 45 },
      { month: '2026-10', revenue: 290, teacher_cost: 10, expenses: 0, gross_margin: 280 },
    ]);
    expect(t).toMatchObject({ revenue: 435, teacher_cost: 10, expenses: 100, gross_margin: 325 });
    expect(t.expenses_by_category).toEqual({ ads: 100 });
  });

  it('a currency without a rate is left out everywhere', () => {
    const t = financeTotals(facts({ payments: [{ amount: 50, currency: 'USD', month: '2026-10', source: 'other' }] }));
    expect(t.revenue).toBe(0);
    expect(t.by_source.size).toBe(0);
  });

  it('by source: revenue to the payer, a group lesson cost split equally, no students → unknown', () => {
    const t = financeTotals(
      facts({
        payments: [{ amount: 145, currency: 'SAR', month: '2026-10', source: 'facebook_ad' }],
        costs: [
          { amount: 260, currency: 'EGP', month: '2026-10', sources: ['facebook_ad', 'referral'] },
          { amount: 13, currency: 'EGP', month: '2026-10', sources: [] },
        ],
      }),
    );
    expect(t.by_source.get('facebook_ad')).toEqual({ revenue: 145, teacher_cost: 10 });
    expect(t.by_source.get('referral')).toEqual({ revenue: 0, teacher_cost: 10 });
    expect(t.by_source.get('unknown')).toEqual({ revenue: 0, teacher_cost: 1 });
  });

  it('a negative margin stays negative; facts outside the months are ignored', () => {
    const t = financeTotals(
      facts({
        costs: [{ amount: 1300, currency: 'EGP', month: '2026-10', sources: ['other'] }],
        expenses: [{ amount: 99, currency: 'SAR', month: '2026-11', category: 'tools' }],
      }),
    );
    expect(t.gross_margin).toBe(-100);
    expect(t.expenses).toBe(0);
  });
});
