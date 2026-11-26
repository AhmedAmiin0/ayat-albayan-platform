import { calendarDaysBetween } from '@ab/time';
// Receivables: who still owes on a package, how much and for how long; pure.

import { toCents } from '@ab/core';
import { dueOf } from '../owed';
import type {
  AgingBucket,
  ReceivableIn,
  ReceivableRow,
  ReceivableTotal,
} from './receivables.schemas';

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return '0_30';
  if (days <= 60) return '31_60';
  return days <= 90 ? '61_90' : '90_plus';
}

/** Days from `startsOn` to `today` (both YYYY-MM-DD), never below 0. */
export function daysSince(startsOn: string, today: string): number {
  return Math.max(0, calendarDaysBetween(startsOn, today));
}

/** Packages that still owe (owed = owedFor − net paid > 0), the oldest debt first. */
export function receivablesOf(input: {
  subs: readonly ReceivableIn[];
  paid: ReadonlyMap<string, number>;
  today: string;
}): ReceivableRow[] {
  return input.subs
    .flatMap((s) => {
      const paid = input.paid.get(s.id) ?? 0;
      const owed = dueOf(s, paid);
      if (owed <= 0) return [];
      const days = daysSince(s.starts_on, input.today);
      return [{ ...s, paid, owed, days_overdue: days, bucket: agingBucket(days) }];
    })
    .sort(
      (a, b) =>
        b.days_overdue - a.days_overdue || a.student.name.localeCompare(b.student.name, 'ar'),
    );
}

/** Per currency: the total owed and the total in each aging bucket (cents-exact). */
export function receivableTotals(rows: readonly ReceivableRow[]): ReceivableTotal[] {
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
    buckets: {
      '0_30': t['0_30'] / 100,
      '31_60': t['31_60'] / 100,
      '61_90': t['61_90'] / 100,
      '90_plus': t['90_plus'] / 100,
    },
  }));
}
