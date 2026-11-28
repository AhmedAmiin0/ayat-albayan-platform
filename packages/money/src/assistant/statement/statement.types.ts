import type { StatementLineKind } from './statement';

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
