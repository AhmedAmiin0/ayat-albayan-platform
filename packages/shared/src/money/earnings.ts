import { z } from 'zod';
import { PAYMENT_METHODS, type Duration, type PaymentMethod } from '../enums/index.js';
import { optionalText } from '../schemas/common.js';
import { RECEIPT_MAX_BYTES, RECEIPT_MIMES, moneyAmount, pastInstant } from './schemas.js';

// Per-session teacher earnings (migrations 176–179, docs/11 §8b). A session earns the teacher a
// rate (EGP); an admin pays it in whole or in parts; the teacher reads her own balance.

export const TEACHER_EARNING_STATUSES = ['earned', 'partially_paid', 'paid'] as const;
export type TeacherEarningStatus = (typeof TEACHER_EARNING_STATUSES)[number];

/**
 * POST /teachers/:id/earnings/payments. `earningIds` = the ticked sessions (omitted → every open
 * session); `amount` is spread oldest first, so it may be partial but never above what is owed.
 */
export const teacherPaymentCreateSchema = z.object({
  amount: moneyAmount,
  method: z.enum(PAYMENT_METHODS),
  paidAt: pastInstant,
  earningIds: z.array(z.uuid()).min(1).max(200).optional(),
  receiptPath: z.string().min(1).nullish(),
  note: optionalText,
  /** Made once per pay dialog, re-sent on every retry (rule 8). */
  clientRequestId: z.uuid(),
});

/** POST /teachers/:id/earnings/receipt-upload-url. */
export const teacherReceiptUploadSchema = z.object({
  mime: z.enum(RECEIPT_MIMES, { message: 'receipt_type' }),
  size: z.int().min(1).max(RECEIPT_MAX_BYTES, { message: 'receipt_too_large' }),
});

export type TeacherPaymentCreate = z.output<typeof teacherPaymentCreateSchema>;
export type TeacherReceiptUpload = z.output<typeof teacherReceiptUploadSchema>;

/** One session's earning with what was paid against it. Money as numbers (≤ 2 decimals). */
export interface TeacherEarningView {
  id: string;
  lesson_id: string;
  starts_at: string;
  minutes: Duration;
  rate: number;
  amount: number;
  paid: number;
  /** Never negative: a session shrunk below what was paid reads 0 due. */
  outstanding: number;
  status: TeacherEarningStatus;
  currency: 'EGP';
}

export interface TeacherBalance {
  earned: number;
  paid: number;
  outstanding: number;
  sessions: number;
  open_sessions: number;
  currency: 'EGP';
}

export interface TeacherEarningsView {
  teacher: { id: string; display_name_ar: string };
  balance: TeacherBalance;
  /** Newest first. */
  sessions: TeacherEarningView[];
}

export interface TeacherPaymentView {
  id: string;
  amount: number;
  paid_at: string;
  method: PaymentMethod;
  note: string | null;
  has_receipt: boolean;
  /** Monthly-payout settlement (payout_id set) vs a payment typed by an admin. */
  from_payout: boolean;
  sessions: number;
  currency: 'EGP';
}
