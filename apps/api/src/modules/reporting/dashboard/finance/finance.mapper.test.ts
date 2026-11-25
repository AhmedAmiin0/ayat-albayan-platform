import { describe, expect, it } from 'vitest';
import { financeTotals } from './finance';
import { cardFacts, currenciesOf } from './finance.mapper';
import type { FinanceTotalsRow } from './finance.schemas';

const row = (kind: FinanceTotalsRow['kind'], cells: [string, string, string, number]) => {
  const [month, currency, key, amount] = cells;
  return { kind, month, currency, key, amount, n: 1 };
};

// What finance_card_totals returns for the fixture the row-by-row mapper used to read:
// payments 145 SAR (10-01 Riyadh), 40 USD at quote 0.25, a 45 SAR refund, 50 USD without a quote;
// lessons 60 EGP (one referral student), 77.78 EGP (three students), 50 EGP (none), one unrated;
// expenses 17000 + 1300 EGP ads and 100 SAR rent.
const ROWS: FinanceTotalsRow[] = [
  row('payment', ['2026-10', 'SAR', 'facebook_ad', 100]),
  row('payment', ['2026-10', 'SAR', 'referral', 160]),
  row('payment', ['2026-09', 'USD', 'unknown', 50]),
  row('cost', ['2026-10', 'EGP', 'referral', 60 + 77.78 / 3]),
  row('cost', ['2026-10', 'EGP', 'unknown', (2 * 77.78) / 3]),
  row('cost', ['2026-09', 'EGP', 'unknown', 50]),
  row('expense', ['2026-09', 'EGP', 'ads', 17000]),
  row('expense', ['2026-10', 'EGP', 'ads', 1300]),
  row('expense', ['2026-10', 'SAR', 'rent', 100]),
  { kind: 'unrated', month: '', currency: '', key: '', amount: 0, n: 1 },
];

const conversion = {
  currency: 'SAR',
  rates: { SAR: 1, EGP: 13, USD: 0.25 },
  missing: [],
  date: null,
};
const months = ['2026-09', '2026-10'];

describe('cardFacts (the aggregate rows give the totals of the row-by-row mapper)', () => {
  it('equals the totals the old per-row mapper computed on the same fixture', () => {
    const facts = cardFacts(ROWS);
    const t = financeTotals({ conversion, months, ...facts });
    expect(facts.unrated).toBe(1);
    expect(t).toMatchObject({
      revenue: 460,
      teacher_cost: 14.44,
      expenses: 1507.69,
      gross_margin: -1062.14,
      expenses_by_category: { ads: 1407.69, rent: 100 },
    });
    expect(t.by_month).toEqual([
      {
        month: '2026-09',
        revenue: 200,
        teacher_cost: 3.85,
        expenses: 1307.69,
        gross_margin: -1111.54,
      },
      { month: '2026-10', revenue: 260, teacher_cost: 10.6, expenses: 200, gross_margin: 49.4 },
    ]);
    expect(t.by_source.get('facebook_ad')).toEqual({ revenue: 100, teacher_cost: 0 });
    expect(t.by_source.get('referral')?.teacher_cost).toBeCloseTo(6.60974359, 6);
    expect(t.by_source.get('unknown')?.teacher_cost).toBeCloseTo(7.83487179, 6);
  });

  it('a source the catalogue does not know is booked as unknown', () => {
    const facts = cardFacts([row('payment', ['2026-10', 'SAR', 'carrier_pigeon', 5])]);
    expect(facts.payments).toEqual([
      { amount: 5, currency: 'SAR', month: '2026-10', source: 'unknown' },
    ]);
  });

  it('no rows: no facts and no unrated lessons', () => {
    expect(cardFacts([])).toEqual({ payments: [], costs: [], expenses: [], unrated: 0 });
  });
});

describe('currenciesOf', () => {
  it('collects every currency met once', () => {
    const { payments, costs, expenses } = cardFacts(ROWS);
    expect([...currenciesOf(payments, costs, expenses)].sort()).toEqual(['EGP', 'SAR', 'USD']);
  });
});
