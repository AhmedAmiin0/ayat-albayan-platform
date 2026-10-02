// expenses from an invented income statement (E4).
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, row } from '../../sources/sheets/fixtures.ts';
import type { Mapped } from '../../types.ts';
import { mapExpenses } from './expenses.ts';

const s = (
  label: string | null,
  value: number | null,
  extra: Record<string, string | number> = {},
) =>
  row({ summary_label: label, summary_value: value, ...extra }, { source: 'FIN', tab: 'general' });

const cols = (m: Mapped[]) => m.map((x) => (x.ok ? x.value.columns : null));

describe('expenses', () => {
  it('one expense per category row and month; zero, staff and totals skipped', () => {
    const out = mapExpenses(
      bundleOf({
        fin_aug: [
          s('Revenue', 12000, { other_amount: 300, other_desc: 'zoom' }),
          s('Ads', 1700),
          s('Content', 1000),
          s('Website', 60),
          s('Followers', 15),
          s('other Expenses', 300),
          s('Staff Expenses', 900),
          s('إجمالي المصروفات', 3975),
        ],
        fin_sept: [s('Ads', 800), s('Content', 0)],
      }),
    );
    expect(cols(out)).toEqual([
      { month: '2026-08-01', category: 'ads', amount: 1700, currency: 'EGP', note: 'Ads' },
      { month: '2026-08-01', category: 'content', amount: 1000, currency: 'EGP', note: 'Content' },
      { month: '2026-08-01', category: 'tools', amount: 60, currency: 'EGP', note: 'Website' },
      { month: '2026-08-01', category: 'ads', amount: 15, currency: 'EGP', note: 'Followers' },
      {
        month: '2026-08-01',
        category: 'other',
        amount: 300,
        currency: 'EGP',
        note: 'other Expenses: zoom',
      },
      { month: '2026-09-01', category: 'ads', amount: 800, currency: 'EGP', note: 'Ads' },
    ]);
    expect(out[0]).toMatchObject({
      key: keys.expense({ month: '2026-08-01', category: 'ads', note: 'Ads', amount: 1700 }),
    });
  });

  it('nothing to import without statement tabs', () => {
    expect(mapExpenses(bundleOf({}))).toEqual([]);
  });
});
