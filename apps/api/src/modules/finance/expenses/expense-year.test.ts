import { describe, expect, it } from 'vitest';
import { expenseYear } from './expense-year';

const conversion = { currency: 'SAR', rates: { SAR: 1, EGP: 13 }, missing: ['AED'], date: '2026-10-01T00:00:00Z' };
type In = { month: string; category: string; amount: number; currency?: string; is_draft?: boolean };
const row = ({ currency = 'EGP', is_draft = false, ...r }: In) => ({ ...r, currency, is_draft });

describe('expenseYear (12-month table in the reporting currency)', () => {
  it('converts, groups by month and category, totals; drafts and unrated currencies are left out', () => {
    const v = expenseYear({
      year: '2026',
      conversion,
      rows: [
        row({ month: '2026-01-01', category: 'rent', amount: 1300 }),
        row({ month: '2026-01-01', category: 'ads', amount: 260 }),
        row({ month: '2026-03-01', category: 'rent', amount: 50, currency: 'SAR' }),
        row({ month: '2026-03-01', category: 'rent', amount: 1300, is_draft: true }),
        row({ month: '2026-04-01', category: 'tools', amount: 99, currency: 'AED' }),
      ],
    });
    expect(v.months).toHaveLength(12);
    expect(v.months[0]).toEqual({ month: '2026-01', total: 120, by_category: { rent: 100, ads: 20 } });
    expect(v.months[2]).toEqual({ month: '2026-03', total: 50, by_category: { rent: 50 } });
    expect(v.months[3]?.total).toBe(0);
    expect(v.total).toBe(170);
    expect(v.categories).toEqual(['ads', 'rent']);
    expect(v.fx_missing).toEqual(['AED']);
    expect(v.currency).toBe('SAR');
  });
});
