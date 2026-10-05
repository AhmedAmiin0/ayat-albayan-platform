import type { PaymentMethod } from '../enums/index.js';
import type { EarningsBalance, EarningStatus } from './earnings.js';

// Per-session teacher earnings responses (docs/11 §10). snake_case, EGP, instants ISO UTC.

export interface TeacherEarningView {
  id: string;
  lesson_id: string;
  starts_at: string;
  minutes: number;
  rate: number;
  amount: number;
  paid_amount: number;
  outstanding: number;
  currency: 'EGP';
  status: EarningStatus;
  /** Names of the students in that lesson. */
  students: string[];
}

export interface TeacherPaymentView {
  id: string;
  teacher_id: string;
  amount: number;
  currency: 'EGP';
  method: PaymentMethod;
  paid_at: string;
  note: string | null;
  has_receipt: boolean;
  /** Set when the payment came from marking a monthly payout paid. */
  payout_id: string | null;
  sessions: number;
  /** Voided payments stay in the history (struck through); their sessions are owed again. */
  voided_at: string | null;
  void_reason: string | null;
}

/** GET /teacher-earnings/summary: one row per teacher with ledger sessions (v_teacher_earnings_summary). */
export interface TeacherEarningsSummaryRow {
  teacher: { id: string; display_name_ar: string };
  sessions: number;
  earned: number;
  paid: number;
  owed: number;
  unpaid_sessions: number;
  /** Start of the oldest session still (partly) unpaid; null when nothing is owed. */
  oldest_unpaid_at: string | null;
}

export interface TeacherEarningsSummaryView {
  currency: 'EGP';
  rows: TeacherEarningsSummaryRow[];
  totals: { earned: number; paid: number; owed: number; teachers_owed: number };
}

export interface TeacherEarningsBalanceView extends EarningsBalance {
  teacher: { id: string; display_name_ar: string };
  currency: 'EGP';
}

/** POST .../payments. `replayed`: this clientRequestId had already been recorded. */
export interface TeacherPaymentResult {
  payment: TeacherPaymentView;
  replayed: boolean;
}
