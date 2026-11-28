import { fromCents, toCents } from '@ab/core';
import { localDay } from '../first-paid';
import { addCalendarDays, addCalendarMonths } from '@ab/time';
import { z } from 'zod';
import type {
  CurrencyTotals,
  StatementLine,
  StatementPlan,
  StatementSalary,
  StatementCommissionInput,
  StatementAdjustmentInput,
} from './statement.types';

// An assistant's monthly statement (migration 20261006000273: build_assistant_statement) in pure
// code: salary + the commissions earned up to that month +/- adjustments, per currency, never
// summed across currencies. The status flow is the teacher payouts' (canTransitionPayout,
// PAYOUT_CORRECTIONS).

export const STATEMENT_LINE_KINDS = ['salary', 'commission', 'adjustment'] as const;
export const statementLineKindSchema = z.enum(STATEMENT_LINE_KINDS);
export type StatementLineKind = z.infer<typeof statementLineKindSchema>;

/** The first day of the month an instant falls in, in a time zone: YYYY-MM-01. */
export const monthOf = (iso: string, tz: string): string => `${localDay(iso, tz).slice(0, 7)}-01`;

/** The last day of a YYYY-MM-01 month: YYYY-MM-DD. */
export function lastDayOf(month: string): string {
  return addCalendarDays(addCalendarMonths(month, 1), -1);
}

/** What is in the statement of `month` (YYYY-MM-01) for an assistant whose time zone is `tz`. */
export function planStatement(input: {
  month: string;
  tz: string;
  salary: StatementSalary | null;
  commissions: readonly StatementCommissionInput[];
  adjustments: readonly StatementAdjustmentInput[];
}): StatementPlan {
  const { month } = input;
  const commissions = input.commissions.filter((c) => monthOf(c.earnedAt, input.tz) <= month);
  const adjustments = input.adjustments.filter((a) => a.effectiveMonth <= month);
  const lines = [
    ...salaryLines(input.salary, month),
    ...commissions.map((c) => lineOf('commission', c.id, c)),
    ...adjustments.map((a) => lineOf('adjustment', a.id, a)),
  ];
  return { lines, totals: totalsOf(lines) };
}

type Amount = Pick<StatementLine, 'amount' | 'currency'>;

const lineOf = (kind: StatementLineKind, ref: string | null, src: Amount): StatementLine => ({
  kind,
  ref,
  amount: src.amount,
  currency: src.currency,
});

function salaryLines(salary: StatementSalary | null, month: string): StatementLine[] {
  const due = salary !== null && salary.amount > 0 && salary.startsOn <= lastDayOf(month);
  return due ? [lineOf('salary', null, salary)] : [];
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
      {
        salary: fromCents(t.salary),
        commissions: fromCents(t.commissions),
        adjustments: fromCents(t.adjustments),
        total: fromCents(t.total),
      },
    ]),
  );
}

/**
 * The month a correction made now belongs to (assistant_next_open_month): this month in the
 * assistant's tz, or the month after their newest approved / paid statement, whichever is later.
 */
export function nextOpenMonth(input: {
  now: string;
  tz: string;
  latestFrozenMonth: string | null;
}): string {
  const current = monthOf(input.now, input.tz);
  if (!input.latestFrozenMonth) return current;
  const after = addCalendarMonths(input.latestFrozenMonth, 1);
  return after > current ? after : current;
}

/**
 * Where a commission voided later goes (void_assistant_commission_row): out of a draft or an
 * unlinked commission silently; out of an approved or paid statement as a negative adjustment in
 * the next open month.
 */
export function voidEffect(
  statement: 'draft' | 'approved' | 'paid' | null,
  commission: { amount: number; currency: string },
  month: string,
): {
  adjustment: { amount: number; currency: string; effectiveMonth: string } | null;
  rebuildDraft: boolean;
} {
  if (statement === 'approved' || statement === 'paid') {
    return {
      adjustment: {
        amount: -commission.amount,
        currency: commission.currency,
        effectiveMonth: month,
      },
      rebuildDraft: false,
    };
  }
  return { adjustment: null, rebuildDraft: statement === 'draft' };
}
