import { convert, round2, type Conversion } from './conversion';
import type { MonthFinance, SourceKey } from './dashboard.types';

// Range finance in the reporting currency (R-RPT-02, docs/11 D1): revenue = payments by paid_at,
// teacher cost = paid lessons × rate (EGP), expenses by their month. Amounts in a currency with
// no rate are left out (Conversion.missing). Months are Riyadh months.

interface Money {
  amount: number;
  currency: string;
  /** "YYYY-MM". */
  month: string;
}
export type PaymentFact = Money & { source: SourceKey };
/** One lesson's cost, split equally between its students' sources (none → unknown). */
export type CostFact = Money & { sources: SourceKey[] };
export type ExpenseFact = Money & { category: string };

export interface FinanceFacts {
  conversion: Conversion;
  months: string[];
  payments: PaymentFact[];
  costs: CostFact[];
  expenses: ExpenseFact[];
}

export type SourceMoney = Map<SourceKey, { revenue: number; teacher_cost: number }>;

export interface FinanceTotals {
  revenue: number;
  teacher_cost: number;
  expenses: number;
  gross_margin: number;
  by_month: MonthFinance[];
  /** Every category met in the range (keys of expense_categories). */
  expenses_by_category: Record<string, number>;
  by_source: SourceMoney;
}

type MonthKey = 'revenue' | 'teacher_cost' | 'expenses';

export function financeTotals(f: FinanceFacts): FinanceTotals {
  const months = new Map(f.months.map((m) => [m, { month: m, revenue: 0, teacher_cost: 0, expenses: 0 }]));
  const categories: Record<string, number> = {};
  const bySource: SourceMoney = new Map();
  const source = (key: SourceKey) => {
    const row = bySource.get(key) ?? { revenue: 0, teacher_cost: 0 };
    bySource.set(key, row);
    return row;
  };
  /** Converted amount of a fact inside the range's months; null = left out. */
  const book = (m: Money, key: MonthKey): number | null => {
    const row = months.get(m.month);
    const v = convert(f.conversion, m.amount, m.currency);
    if (!row || v === null) return null;
    row[key] += v;
    return v;
  };
  for (const p of f.payments) {
    const v = book(p, 'revenue');
    if (v !== null) source(p.source).revenue += v;
  }
  for (const c of f.costs) {
    const v = book(c, 'teacher_cost');
    const keys: SourceKey[] = c.sources.length > 0 ? c.sources : ['unknown'];
    if (v !== null) for (const k of keys) source(k).teacher_cost += v / keys.length;
  }
  for (const e of f.expenses) {
    const v = book(e, 'expenses');
    if (v !== null) categories[e.category] = (categories[e.category] ?? 0) + v;
  }
  const by_month = [...months.values()].map((m) => ({
    month: m.month,
    revenue: round2(m.revenue),
    teacher_cost: round2(m.teacher_cost),
    expenses: round2(m.expenses),
    gross_margin: round2(m.revenue - m.teacher_cost - m.expenses),
  }));
  const sum = (key: MonthKey) => [...months.values()].reduce((n, m) => n + m[key], 0);
  const [revenue, teacher_cost, expenses] = [sum('revenue'), sum('teacher_cost'), sum('expenses')];
  return {
    revenue: round2(revenue),
    teacher_cost: round2(teacher_cost),
    expenses: round2(expenses),
    gross_margin: round2(revenue - teacher_cost - expenses),
    by_month,
    expenses_by_category: Object.fromEntries(Object.entries(categories).map(([c, v]) => [c, round2(v)])),
    by_source: bySource,
  };
}
