import { fromCents, toCents } from '../money/earnings/earnings.js';
import { localDay } from './first-paid.js';

// An assistant's monthly statement (migration 20261006000273: build_assistant_statement) in pure code:
// salary + the commissions earned up to that month +/- adjustments, per currency, never summed across
// currencies. The status flow is the teacher payouts' (canTransitionPayout, PAYOUT_CORRECTIONS).

export interface StatementSalary {
  amount: number;
  currency: string;
  /** YYYY-MM-DD: the first day the salary runs. A full month, no proration. */
  startsOn: string;
}
export interface StatementCommissionInput {
  id: string;
  amount: number;
  currency: string;
  /** ISO instant: when the subscription became fully paid. */
  earnedAt: string;
}
export interface StatementAdjustmentInput {
  id: string;
  /** Signed: a reversal is negative. */
  amount: number;
  currency: string;
  /** YYYY-MM-01: the first statement month that may take it. */
  effectiveMonth: string;
}

export type StatementLineKind = 'salary' | 'commission' | 'adjustment';
export interface StatementLine {
  kind: StatementLineKind;
  /** The commission or adjustment id; null for the salary. */
  ref: string | null;
  amount: number;
  currency: string;
}
export interface CurrencyTotals {
  salary: number;
  commissions: number;
  adjustments: number;
  total: number;
}
export interface StatementPlan {
  lines: StatementLine[];
  totals: Record<string, CurrencyTotals>;
}

/** The first day of the month an instant falls in, in a time zone: YYYY-MM-01. */
export const monthOf = (iso: string, tz: string): string => `${localDay(iso, tz).slice(0, 7)}-01`;

/** The last day of a YYYY-MM-01 month: YYYY-MM-DD. */
export function lastDayOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, m ?? 1, 0)).toISOString().slice(0, 10);
}

/** What is in the statement of `month` (YYYY-MM-01) for an assistant whose time zone is `tz`. */
export function planStatement(input: {
  month: string;
  tz: string;
  salary: StatementSalary | null;
  commissions: readonly StatementCommissionInput[];
  adjustments: readonly StatementAdjustmentInput[];
}): StatementPlan {
  const lines: StatementLine[] = [];
  const { salary } = input;
  if (salary && salary.amount > 0 && salary.startsOn <= lastDayOf(input.month)) {
    lines.push({ kind: 'salary', ref: null, amount: salary.amount, currency: salary.currency });
  }
  for (const c of input.commissions) {
    if (monthOf(c.earnedAt, input.tz) <= input.month) lines.push({ kind: 'commission', ref: c.id, amount: c.amount, currency: c.currency });
  }
  for (const a of input.adjustments) {
    if (a.effectiveMonth <= input.month) lines.push({ kind: 'adjustment', ref: a.id, amount: a.amount, currency: a.currency });
  }
  return { lines, totals: totalsOf(lines) };
}

const FIELD = { salary: 'salary', commission: 'commissions', adjustment: 'adjustments' } as const;

/** Per currency: the lines' sums by kind and the total, in exact cents. */
export function totalsOf(lines: readonly StatementLine[]): Record<string, CurrencyTotals> {
  const cents: Record<string, CurrencyTotals> = {};
  for (const l of lines) {
    const t = (cents[l.currency] ??= { salary: 0, commissions: 0, adjustments: 0, total: 0 });
    t[FIELD[l.kind]] += toCents(l.amount);
    t.total += toCents(l.amount);
  }
  return Object.fromEntries(
    Object.entries(cents).map(([cur, t]) => [
      cur,
      { salary: fromCents(t.salary), commissions: fromCents(t.commissions), adjustments: fromCents(t.adjustments), total: fromCents(t.total) },
    ]),
  );
}

/**
 * The month a correction made now belongs to (assistant_next_open_month): this month in the
 * assistant's tz, or the month after their newest approved / paid statement, whichever is later.
 */
export function nextOpenMonth(input: { now: string; tz: string; latestFrozenMonth: string | null }): string {
  const current = monthOf(input.now, input.tz);
  if (!input.latestFrozenMonth) return current;
  const [y, m] = input.latestFrozenMonth.split('-').map(Number);
  const after = new Date(Date.UTC(y ?? 1970, m ?? 1, 1)).toISOString().slice(0, 10);
  return after > current ? after : current;
}

/**
 * Where a commission voided later goes (void_assistant_commission_row): out of a draft or an unlinked
 * commission silently; out of an approved or paid statement as a negative adjustment in the next open month.
 */
export function voidEffect(
  statement: 'draft' | 'approved' | 'paid' | null,
  commission: { amount: number; currency: string },
  month: string,
): { adjustment: { amount: number; currency: string; effectiveMonth: string } | null; rebuildDraft: boolean } {
  if (statement === 'approved' || statement === 'paid') {
    return { adjustment: { amount: -commission.amount, currency: commission.currency, effectiveMonth: month }, rebuildDraft: false };
  }
  return { adjustment: null, rebuildDraft: statement === 'draft' };
}
