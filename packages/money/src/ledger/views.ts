import type {
  AdminTaskKind,
  Duration,
  PackageSize,
  PaymentKind,
  PaymentMethod,
  PayoutStatus,
  SubscriptionStatus,
} from '@ab/catalog';
import type { QuoteResponse } from '../pricing/quote';
import type { PayoutBreakdownView } from './earnings/payout-breakdown.schemas';

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

export interface PaymentView {
  id: string;
  subscription_id: string;
  student: { id: string; code: string; name: string };
  amount: number;
  currency: string;
  method: PaymentMethod;
  paid_at: string;
  /** Storage path in the receipts bucket; GET /payments/:id/receipt signs it. */
  receipt_path: string | null;
  recorded_by: { id: string; full_name: string } | null;
  note: string | null;
  created_at: string;
  /** A refund counts against what was paid. */
  kind: PaymentKind;
  /** What the family sent when it was another currency (amount/currency are the package's). */
  original: { amount: number; currency: string; fx_rate: number } | null;
  /** Recorded from the booking's invoice: the invoice is the receipt. */
  invoice_id: string | null;
}

/** A signed attachment (1 h); a pre-attachments payment shows receipt_path as legacy 'receipt'. */
export interface PaymentAttachmentView {
  id: string;
  mime: string | null;
  size: number | null;
  url: string;
  expires_at: string;
  legacy: boolean;
}

export interface PayoutView {
  id: string;
  teacher: { id: string; display_name_ar: string };
  month: string;
  lessons_count: number;
  amount: number;
  currency: 'EGP';
  status: PayoutStatus;
  approved_at: string | null;
  paid_at: string | null;
  breakdown: PayoutBreakdownView;
  /** Open payouts only: already paid per session in the ledger (docs/11 §10), so due = amount − ledger_paid. */
  ledger_paid?: number;
  /** How a paid payout was paid (migration 20261005000201). */
  method?: PaymentMethod | null;
  note?: string | null;
  has_receipt?: boolean;
}

/** POST /payouts/:month/generate: draft rows written, and teachers skipped for a missing rate. */
export interface PayoutGenerateResult {
  month: string;
  payouts: PayoutView[];
  missing_rates: { teacher_id: string; display_name_ar: string; durations: number[] }[];
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
