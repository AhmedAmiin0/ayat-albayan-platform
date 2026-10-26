import type { Enums } from '@ab/db';
import { fromCents, toCents } from '../money/earnings/earnings.js';

// Assistant (base role sales) commission, the rule of migration 20261006000272 in pure code
// (owner, 2026-10-06). The database decides; this twin is what the API and the screens preview with,
// and its tests pin the same arithmetic. Money is integer cents inside, 2 decimals outside.

export const ASSISTANT_COMMISSION_TYPES = ['percent', 'fixed'] as const satisfies readonly Enums<'assistant_commission_type'>[];
export const ASSISTANT_COMMISSION_STATUSES = ['earned', 'voided'] as const satisfies readonly Enums<'assistant_commission_status'>[];
export type AssistantCommissionType = (typeof ASSISTANT_COMMISSION_TYPES)[number];
export type AssistantCommissionStatus = (typeof ASSISTANT_COMMISSION_STATUSES)[number];

export interface CommissionInput {
  type: AssistantCommissionType;
  /** percent: 0-100 points of the base; fixed: the amount. */
  value: number;
  /** fixed only: the currency the fixed amount is in. */
  currency: string | null;
  /** The subscription price, in its own currency. */
  base: number;
  baseCurrency: string;
  /** Percent of the normal commission earned (a renewal: settings.renewal_commission_percent); default 100. */
  share?: number;
}

export interface CommissionAmount {
  amount: number;
  currency: string;
}

/** n / d rounded half up, for n >= 0 (exact while n stays a safe integer: prices up to ~90 billion cents). */
const roundDiv = (n: number, d: number): number => Math.floor((n + d / 2) / d);

/**
 * percent = value % of the subscription price in its own currency; fixed = value in its currency; either
 * times share % (a renewal, migration 20261027000751). Rounded half up to 2 decimals, once (SQL
 * round(numeric, 2)). null when nothing is earned: zero amount, a fixed commission without a currency, or
 * a value or share outside its limits.
 */
export function computeCommission(input: CommissionInput): CommissionAmount | null {
  const share = input.share ?? 100;
  if (!(input.value > 0) || !(input.base >= 0) || !(share >= 0 && share <= 100)) return null;
  if (input.type === 'fixed') {
    if (!input.currency) return null;
    const fixed = roundDiv(toCents(input.value) * share, 100);
    return fixed > 0 ? { amount: fromCents(fixed), currency: input.currency } : null;
  }
  if (input.value > 100) return null;
  // price in cents x value in hundredths of a percent x share, / 1 000 000, rounded half up: exact integer maths.
  const cents = roundDiv(toCents(input.base) * toCents(input.value) * share, 1_000_000);
  return cents > 0 ? { amount: fromCents(cents), currency: input.baseCurrency } : null;
}

/** What happens to the student's one commission when a payment, refund or price change lands. */
export type CommissionAction = 'earn' | 'reinstate' | 'void' | 'keep' | 'none';

export interface CommissionState {
  status: AssistantCommissionStatus;
  /** voided by a payment change (true) or by an admin (false). */
  voidAuto: boolean | null;
  /** Is the subscription the commission was earned on still fully paid? */
  stillFullyPaid: boolean;
}

/**
 * The evaluator's decision (evaluate_assistant_commission). `eligible`: the student has a first fully
 * paid subscription that passes the terms (planCommission is not null).
 *   no row yet          earn when eligible, else none
 *   earned, still full  keep
 *   earned, not full    void (and earned again on another subscription when that one is eligible)
 *   voided by a payment reinstate when eligible, else none; voided by an admin: keep (stays voided)
 */
export function commissionAction(existing: CommissionState | null, eligible: boolean): CommissionAction {
  if (!existing) return eligible ? 'earn' : 'none';
  if (existing.status === 'earned') return existing.stillFullyPaid ? 'keep' : 'void';
  if (existing.voidAuto === false) return 'keep';
  return eligible ? 'reinstate' : 'none';
}
