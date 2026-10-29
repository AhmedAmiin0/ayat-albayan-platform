import type { PaymentMethod, PayoutStatus } from '../enums/index.js';
import { fromCents, toCents } from '../money/index.js';
import type { AssistantCommissionStatus } from './commission.js';
import type { AssistantCommissionKind } from './kind.js';
import { monthOf } from './statement.js';

// «محفظتي» (owner 2026-10-29): the salesperson's own commissions as a wallet. A commission is owed until a
// PAID statement holds it; a draft is the admin's work in progress, so it reads as owed. Commissions only:
// the salary and the admin's own adjustments stay in «الكشوف». Per currency, never summed across them.

/** due: no statement or a draft one; in_statement: an approved one; paid: a paid one; voided: taken back. */
export type WalletState = 'due' | 'in_statement' | 'paid' | 'voided';

/** The reasons the database writes itself (codes of assistantReasons); an admin's typed text is never shown. */
export const WALLET_VOID_REASONS = ['payment_voided', 'student_merged'] as const;
export type WalletVoidReason = (typeof WALLET_VOID_REASONS)[number];

/** One currency of the wallet. */
export interface WalletTotals {
  /** «مستحق لك»: not on a paid statement yet, less the reversals not paid back (negative after a paid one is voided). */
  due: number;
  /** «دُفع لك»: on paid statements (a reversal paid back lowers it). */
  paid: number;
  /** Earned this month, in the assistant's time zone. */
  this_month: number;
}

/** GET /sales/me/commissions rows: mine only, newest first. No price, base amount or subscription. */
export interface MyCommissionRow {
  id: string;
  student: { code: string; name: string };
  kind: AssistantCommissionKind;
  /** 100 for a first commission, the renewal share it was earned at for a renewal. */
  share_percent: number;
  amount: number;
  currency: string;
  earned_at: string;
  /** How the package was paid (the payment that completed it): «بطاقة (دفع إلكتروني)», «تحويل بنكي», …; null without one. */
  method: PaymentMethod | null;
  state: WalletState;
  /** YYYY-MM-01 of the approved or paid statement it sits in; null otherwise. */
  statement_month: string | null;
  /** A voided row's system reason; null when an admin voided it by hand. */
  void_reason: WalletVoidReason | null;
}

/** A commission's place in the wallet: voided wins; then the statement it sits in, if any. */
export function walletState(status: AssistantCommissionStatus, statement: PayoutStatus | null): WalletState {
  if (status === 'voided') return 'voided';
  if (statement === 'paid') return 'paid';
  return statement === 'approved' ? 'in_statement' : 'due';
}

/**
 * One money line of the wallet: an earned commission, a voided one still held by a frozen statement (it was
 * counted there), or the reversal adjustment such a void writes (negative, migration 272).
 */
export interface WalletLine {
  /** Signed: a reversal is negative. */
  amount: number;
  currency: string;
  statement: { status: PayoutStatus } | null;
  /** An earned commission's instant (counts toward this month); null for a voided one and a reversal. */
  earned_at: string | null;
}

/**
 * The wallet per currency in exact cents: a line on a paid statement is paid, any other line is due; this
 * month = what was earned in `at.month` (the assistant's tz). A commission voided inside an approved
 * statement nets to 0 owed with its reversal; voided after it was paid: paid stays, due goes negative.
 */
export function walletTotals(lines: readonly WalletLine[], at: { month: string; tz: string }): Record<string, WalletTotals> {
  const cents: Record<string, WalletTotals> = {};
  for (const l of lines) {
    const sum = (cents[l.currency] ??= { due: 0, paid: 0, this_month: 0 });
    const c = toCents(l.amount);
    if (l.statement?.status === 'paid') sum.paid += c;
    else sum.due += c;
    if (l.earned_at && monthOf(l.earned_at, at.tz) === at.month) sum.this_month += c;
  }
  return Object.fromEntries(
    Object.entries(cents).map(([currency, s]) => [currency, { due: fromCents(s.due), paid: fromCents(s.paid), this_month: fromCents(s.this_month) }]),
  );
}
