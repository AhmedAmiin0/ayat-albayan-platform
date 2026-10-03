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
