import type { PaymentKind, PaymentMethod } from '@ab/catalog';
import type { AssistantCommissionStatus } from './commission';
import type { AssistantTermsView } from './schemas';
import type { CurrencyTotals } from './statement';
import type { AssistantStatementView } from './statement-view.schemas';
import type { WalletTotals } from './wallet';

// Assistant (base role sales) responses: snake_case, instants ISO UTC, months and days
// YYYY-MM-01 / YYYY-MM-DD. Amounts are per currency; nothing here sums across currencies.

/** GET /sales/me/students: the students this assistant brought, newest first. */
export interface MyStudentRow {
  id: string;
  code: string;
  name: string;
  brought_at: string;
  /** The guardian's E.164 phone, null without one; never another contact. */
  guardian_phone: string | null;
  /** Has any of their subscriptions been paid in full? (No price, no amounts.) */
  first_subscription_paid: boolean;
  commission: {
    amount: number;
    currency: string;
    status: AssistantCommissionStatus;
    earned_at: string;
  } | null;
  /** Renewal commissions this student earned her (no per-student amounts after the first). */
  renewal_commissions: number;
}

/** GET /sales/me/earnings. */
export interface MyEarnings {
  terms: AssistantTermsView | null;
  /** This month so far, as the next statement would be (planStatement), per currency. */
  this_month: Record<string, CurrencyTotals>;
  /** All earned commissions per currency, kept for older app builds. */
  commissions_total: Record<string, number>;
  /** The wallet per currency (walletTotals): owed, paid, earned this month; commissions only. */
  wallet: Record<string, WalletTotals>;
  statements: AssistantStatementView[];
}

/**
 * GET /sales/me/payments: only payments this assistant recorded; no price, no other subscription
 * data.
 */
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
