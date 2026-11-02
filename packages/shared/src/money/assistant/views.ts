import type { PaymentKind, PaymentMethod, PayoutStatus } from '@ab/catalog';
import type { AssistantCommissionStatus, AssistantCommissionType } from './commission.js';
import type { AssistantCommissionKind } from './kind.js';
import type { CurrencyTotals, StatementLineKind } from './statement.js';
import type { WalletTotals } from './wallet.js';

// Assistant (base role sales) responses (owner, 2026-10-06). snake_case, instants ISO UTC, months and
// days YYYY-MM-01 / YYYY-MM-DD. Amounts are per currency; nothing here sums across currencies.

/** GET /assistant-pay/terms (admin) and the `terms` of /sales/me/earnings. */
export interface AssistantTermsView {
  assistant_id: string;
  commission: { type: AssistantCommissionType; value: number; currency: string | null; starts_on: string } | null;
  salary: { amount: number; currency: string; starts_on: string } | null;
  /**
   * The share of the commission earned on each renewal now (owner 2026-10-26):
   * settings.renewal_commission_percent, 0 while «عمولة التجديد» is off (renewalShareNow,
   * owner 2026-11-01); the screens then say it is paused.
   */
  renewal_share_percent: number;
}

/** GET /assistant-pay/terms rows: every assistant with their terms (both null until an admin sets them). */
export interface AssistantTermsRow extends AssistantTermsView {
  name: string;
}

/** POST /assistant-pay/brought-by. */
export interface BroughtByResult {
  changed: number;
}

/** GET /assistant-pay/brought-by/:studentId: who brought a student and when (both null when nobody did). */
export interface BroughtByView {
  assistant: { id: string; name: string } | null;
  brought_at: string | null;
}

/** GET /assistant-pay/commissions (admin ledger, all assistants). */
export interface AssistantCommissionView {
  id: string;
  assistant: { id: string; name: string };
  student: { id: string; code: string; name: string };
  subscription_id: string | null;
  /** 'first' (once per student) or 'renewal' (each later package, at share_percent of the normal commission). */
  kind: AssistantCommissionKind;
  /** The share of the normal commission it was earned at: 100 for a first, the setting at earn time for a renewal. */
  share_percent: number;
  type: AssistantCommissionType;
  /** The term's value when it was earned: percent points, or the fixed amount. */
  rate: number;
  base_amount: number;
  base_currency: string;
  amount: number;
  currency: string;
  earned_at: string;
  status: AssistantCommissionStatus;
  void_reason: string | null;
  voided_at: string | null;
  statement_id: string | null;
}

export interface AssistantStatementLineView {
  kind: StatementLineKind;
  amount: number;
  currency: string;
  /** commission lines: the student; adjustment lines: the reason. */
  student: { code: string; name: string } | null;
  /** commission lines: «عمولة» or «عمولة تجديد»; null on the other lines. */
  commission_kind: AssistantCommissionKind | null;
  reason: string | null;
}

/** GET /assistant-pay/statements rows and details; a salesperson's own in /sales/me/earnings. */
export interface AssistantStatementView {
  id: string;
  assistant: { id: string; name: string };
  month: string;
  status: PayoutStatus;
  /** Frozen with the statement: {currency: {salary, commissions, adjustments, total}}. */
  totals: Record<string, CurrencyTotals>;
  lines: AssistantStatementLineView[];
  approved_at: string | null;
  paid_at: string | null;
  method: PaymentMethod | null;
  note: string | null;
  has_receipt: boolean;
}

/** GET /sales/me/students: the students this assistant brought, newest first. */
export interface MyStudentRow {
  id: string;
  code: string;
  name: string;
  brought_at: string;
  /** The guardian's E.164 phone (owner 2026-10-27), null without one; never another contact. */
  guardian_phone: string | null;
  /** Has any of their subscriptions been paid in full? (No price, no amounts.) */
  first_subscription_paid: boolean;
  commission: { amount: number; currency: string; status: AssistantCommissionStatus; earned_at: string } | null;
  /** How many renewal commissions this student earned her (no amounts per student beyond the first). */
  renewal_commissions: number;
}

/** GET /sales/me/earnings. */
export interface MyEarnings {
  terms: AssistantTermsView | null;
  /** This month so far, as the next statement would be (planStatement), per currency. */
  this_month: Record<string, CurrencyTotals>;
  /** All earned commissions, per currency (kept for app builds older than «محفظتي»). */
  commissions_total: Record<string, number>;
  /** «محفظتي» per currency (walletTotals): owed, paid, earned this month. Commissions only. */
  wallet: Record<string, WalletTotals>;
  statements: AssistantStatementView[];
}

/** GET /sales/me/payments: only payments this assistant recorded; no price, no other subscription data. */
export interface MyPaymentRow {
  id: string;
  student: { id: string; code: string; name: string };
  kind: PaymentKind;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paid_at: string;
  note: string | null;
}
