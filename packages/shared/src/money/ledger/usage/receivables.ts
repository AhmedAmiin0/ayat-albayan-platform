import { calendarDaysBetween } from '@ab/time';
// Receivables («مستحق على الطلاب», owner 2026-10-05): who still owes on a package, how much and
// for how long. Pure; the API reads the packages and their net paid, the dashboard converts.

import { round2, toCents } from '@ab/core';

export const AGING_BUCKETS = ['0_30', '31_60', '61_90', '90_plus'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export interface ReceivableIn {
  id: string;
  student: { id: string; code: string; name: string };
  guardian: { name: string; phone_e164: string | null } | null;
  price: number;
  currency: string;
  /** The package's first day (YYYY-MM-DD): what is owed is due from then. */
  starts_on: string;
  status: string;
}

export interface ReceivableRow extends ReceivableIn {
  paid: number;
  owed: number;
  days_overdue: number;
  bucket: AgingBucket;
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return '0_30';
  if (days <= 60) return '31_60';
  return days <= 90 ? '61_90' : '90_plus';
}

/** Days from `startsOn` to `today` (both YYYY-MM-DD), never below 0. */
export function daysSince(startsOn: string, today: string): number {
  return Math.max(0, calendarDaysBetween(startsOn, today));
}

/** Packages that still owe (owed = price − net paid > 0), the oldest debt first. */
export function receivablesOf(input: {
  subs: readonly ReceivableIn[];
  paid: ReadonlyMap<string, number>;
  today: string;
}): ReceivableRow[] {
  return input.subs
    .flatMap((s) => {
      const paid = input.paid.get(s.id) ?? 0;
      const owed = round2(Number(s.price) - paid);
      if (owed <= 0) return [];
      const days = daysSince(s.starts_on, input.today);
      return [{ ...s, paid, owed, days_overdue: days, bucket: agingBucket(days) }];
    })
    .sort((a, b) => b.days_overdue - a.days_overdue || a.student.name.localeCompare(b.student.name, 'ar'));
}

/** Per currency: the total owed and the total in each aging bucket (cents-exact). */
export function receivableTotals(rows: readonly ReceivableRow[]): {
  currency: string;
  owed: number;
  buckets: Record<AgingBucket, number>;
}[] {
  const by = new Map<string, Record<AgingBucket | 'owed', number>>();
  for (const r of rows) {
    const t = by.get(r.currency) ?? { owed: 0, '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
    t.owed += toCents(r.owed);
    t[r.bucket] += toCents(r.owed);
    by.set(r.currency, t);
  }
  return [...by.entries()].sort().map(([currency, t]) => ({
    currency,
    owed: t.owed / 100,
    buckets: { '0_30': t['0_30'] / 100, '31_60': t['31_60'] / 100, '61_90': t['61_90'] / 100, '90_plus': t['90_plus'] / 100 },
  }));
}

/** GET /receivables. */
export interface ReceivablesView {
  rows: ReceivableRow[];
  totals: ReturnType<typeof receivableTotals>;
  /** Every currency's owed, in `currency` (settings.reporting_currency). */
  total: number;
  currency: string;
  fx_missing: string[];
}
