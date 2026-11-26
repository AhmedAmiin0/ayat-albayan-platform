import type { AdminTaskKind, Duration, PackageSize, SubscriptionStatus } from '@ab/catalog';
import type { QuoteResponse } from '../pricing/quote';

// Money responses (docs/11 §5–9). snake_case rows; instants ISO UTC; money as numbers
// with at most 2 decimals; local dates YYYY-MM-DD; months YYYY-MM.

/** One v_subscription_balance row (R-SUB-01, R-SUB-03). */
export interface BalanceView {
  subscription_id: string;
  lessons_total: number;
  lessons_used: number;
  /** Negative only on the newest package: lessons attended past every package. */
  remaining: number;
  ended_at: string | null;
  projected_end_at: string | null;
}

export interface SubscriptionView {
  id: string;
  student: { id: string; code: string; name: string };
  /** null = a custom lesson count. */
  package: PackageSize | null;
  duration: Duration;
  lessons_total: number;
  /** Taken before the platform, counted in balance.lessons_used; absent from older APIs. */
  lessons_used_before?: number;
  /** Per student, after discount, in `currency` (quote.afterDiscount for students = 1). */
  price: number;
  currency: string;
  fx_rate: number | null;
  fx_date: string | null;
  /** The catalog quote the price came from (docs/08 §4: reproducible). */
  price_source: QuoteResponse;
  starts_on: string;
  status: SubscriptionStatus;
  /** A cancelled package's kind, 'unused' or 'stopped' (still owed: countsForMoney). */
  cancel_kind?: string | null;
  /** A stopped course's stored decision: what it is owed for (owedFor); null otherwise. */
  stop_owed_amount?: number | null;
  renews_on: string | null;
  notes: string | null;
  /** Sum of payments in `currency`. */
  paid: number;
  balance: BalanceView;
  created_at: string;
}

/** GET /students/:id/balance: the student's packages, oldest first, and the total left. */
export interface StudentBalanceView {
  student_id: string;
  /** studentRemaining(packages). */
  remaining: number;
  /** The newest package, which alerts and lesson flags follow; null without packages. */
  current: SubscriptionView | null;
  packages: SubscriptionView[];
}

/** GET /students/:id/balance for a teacher: lessons only, never price, paid, fx or the quote. */
export interface TeacherBalanceView {
  student_id: string;
  remaining: number;
  packages: BalanceView[];
}

export interface AdminTaskView {
  id: string;
  kind: AdminTaskKind;
  subject_type: string;
  subject_id: string;
  /** For subscription tasks: the student, so the UI can name them. */
  student: { id: string; code: string; name: string } | null;
  title: string | null;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
}
