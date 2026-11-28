import type { PayoutStatus } from '@ab/catalog';
import { fromCents, toCents } from '@ab/core';
import type { AssistantCommissionStatus } from './commission';
import type { WalletState, WalletTotals } from './my-view.schemas';
import { monthOf } from './statement';

// A commission is owed until a paid statement holds it; per currency, never summed across them.

/**
 * The reasons the database writes itself (codes of assistantReasons); an admin's typed text is
 * never shown.
 */
export const WALLET_VOID_REASONS = ['payment_voided', 'student_merged'] as const;
export type WalletVoidReason = (typeof WALLET_VOID_REASONS)[number];

/** A commission's place in the wallet: voided wins; then the statement it sits in, if any. */
export function walletState(
  status: AssistantCommissionStatus,
  statement: PayoutStatus | null,
): WalletState {
  if (status === 'voided') return 'voided';
  if (statement === 'paid') return 'paid';
  return statement === 'approved' ? 'in_statement' : 'due';
}

/**
 * One money line of the wallet. Frozen: a commission line or a reversal line of an approved or paid
 * statement, as the statement holds it (not the commission row, which a later re-earn or a merge
 * changes). Open: an earned commission with no statement or a draft one, and a reversal (negative)
 * not in a frozen statement yet.
 */
export interface WalletLine {
  /** Signed: a reversal is negative. */
  amount: number;
  currency: string;
  statement: { status: PayoutStatus } | null;
}

/** An earned commission, in a statement or not: what "this month" counts. */
export interface WalletEarning {
  amount: number;
  currency: string;
  earned_at: string;
}

/**
 * The wallet per currency in exact cents: a line on a paid statement is paid, any other line is
 * due; this month = the commissions earned in `at.month` (the assistant's tz). A commission voided
 * inside an approved statement nets to 0 owed with its reversal; voided after it was paid: paid
 * stays, due goes negative.
 */
export function walletTotals(
  lines: readonly WalletLine[],
  earned: readonly WalletEarning[],
  at: { month: string; tz: string },
): Record<string, WalletTotals> {
  const cents: Record<string, WalletTotals> = {};
  const of = (currency: string): WalletTotals =>
    (cents[currency] ??= { due: 0, paid: 0, this_month: 0 });
  for (const l of lines) {
    if (l.statement?.status === 'paid') of(l.currency).paid += toCents(l.amount);
    else of(l.currency).due += toCents(l.amount);
  }
  for (const e of earned)
    if (monthOf(e.earned_at, at.tz) === at.month) of(e.currency).this_month += toCents(e.amount);
  return Object.fromEntries(
    Object.entries(cents).map(([currency, s]) => [
      currency,
      { due: fromCents(s.due), paid: fromCents(s.paid), this_month: fromCents(s.this_month) },
    ]),
  );
}
