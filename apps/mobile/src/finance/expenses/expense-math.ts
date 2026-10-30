import { round2, type ExpenseView } from '@ab/shared';

interface CategoryTotal {
  category: string;
  amount: number;
}

export interface CurrencyTotals {
  currency: string;
  total: number;
  categories: CategoryTotal[];
}


/**
 * The month's totals per currency (amounts are never mixed or converted here, as on the web), each
 * with its categories, biggest first. Recurring drafts are not counted until confirmed.
 */
export function totalsByCurrency(rows: readonly ExpenseView[]): CurrencyTotals[] {
  const sums = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.is_draft) continue;
    const cats = sums.get(r.currency) ?? new Map<string, number>();
    cats.set(r.category, round2((cats.get(r.category) ?? 0) + r.amount));
    sums.set(r.currency, cats);
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, cats]) => {
      const categories = [...cats.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
      return { currency, total: round2(categories.reduce((s, c) => s + c.amount, 0)), categories };
    });
}
