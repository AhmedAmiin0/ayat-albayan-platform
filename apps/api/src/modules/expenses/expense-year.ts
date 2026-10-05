import type { ExpenseYearView } from '@ab/shared';
import { convert, round2, type Conversion } from '../dashboard/conversion';

type Row = { month: string; category: string; amount: number; currency: string; is_draft: boolean };

/**
 * The 12-month table (pure): each confirmed expense converted to the reporting currency and added
 * to its month and category. Drafts are left out; a currency without a rate is listed in fx_missing.
 */
export function expenseYear(input: { year: string; rows: readonly Row[]; conversion: Conversion }): ExpenseYearView {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: `${input.year}-${String(i + 1).padStart(2, '0')}`,
    total: 0,
    by_category: {} as Record<string, number>,
  }));
  const categories = new Set<string>();
  for (const r of input.rows) {
    if (r.is_draft) continue;
    const v = convert(input.conversion, Number(r.amount), r.currency);
    const m = months[Number(r.month.slice(5, 7)) - 1];
    if (v === null || !m || !r.month.startsWith(input.year)) continue;
    m.total += v;
    m.by_category[r.category] = (m.by_category[r.category] ?? 0) + v;
    categories.add(r.category);
  }
  const rounded = months.map((m) => ({
    month: m.month,
    total: round2(m.total),
    by_category: Object.fromEntries(Object.entries(m.by_category).map(([k, v]) => [k, round2(v)])),
  }));
  return {
    year: input.year,
    currency: input.conversion.currency,
    months: rounded,
    categories: [...categories].sort(),
    total: round2(months.reduce((n, m) => n + m.total, 0)),
    fx_missing: input.conversion.missing,
    fx_date: input.conversion.date,
  };
}
