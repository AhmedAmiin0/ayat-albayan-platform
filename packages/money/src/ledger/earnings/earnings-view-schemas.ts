import { ALL_PAYMENT_METHODS } from '@ab/catalog';
import { z } from 'zod';
import { EARNING_STATUSES } from './earnings';

// Per-session teacher earnings answers (docs/11 §10): snake_case, EGP only, instants ISO UTC.

const egp = z.literal('EGP');
const teacherRef = z.object({ id: z.string(), display_name_ar: z.string() });
const count = () => z.number().int();

export const earningStatusSchema = z.enum(EARNING_STATUSES);

export const teacherEarningViewSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  starts_at: z.string(),
  minutes: count(),
  rate: z.number(),
  amount: z.number(),
  paid_amount: z.number(),
  outstanding: z.number(),
  currency: egp,
  status: earningStatusSchema,
  /** Names of the students in that lesson. */
  students: z.array(z.string()),
});

export const teacherPaymentViewSchema = z.object({
  id: z.string(),
  teacher_id: z.string(),
  amount: z.number(),
  currency: egp,
  method: z.enum(ALL_PAYMENT_METHODS),
  paid_at: z.string(),
  note: z.string().nullable(),
  has_receipt: z.boolean(),
  /** Set when the payment came from marking a monthly payout paid. */
  payout_id: z.string().nullable(),
  sessions: count(),
  /** Voided payments stay in the history (struck through); their sessions are owed again. */
  voided_at: z.string().nullable(),
  void_reason: z.string().nullable(),
});

export const earningsBalanceSchema = z.object({
  earned: z.number(),
  paid: z.number(),
  outstanding: z.number(),
  /** Paid above a session's corrected amount; shown apart, never netted against other sessions. */
  overpaid: z.number(),
  sessions: count(),
  unpaid_sessions: count(),
});

export const teacherEarningsBalanceViewSchema = earningsBalanceSchema.extend({
  teacher: teacherRef,
  currency: egp,
});

/** One row per teacher with ledger sessions (v_teacher_earnings_summary). */
export const teacherEarningsSummaryRowSchema = z.object({
  teacher: teacherRef,
  sessions: count(),
  earned: z.number(),
  paid: z.number(),
  owed: z.number(),
  unpaid_sessions: count(),
  /** Start of the oldest session still (partly) unpaid; null when nothing is owed. */
  oldest_unpaid_at: z.string().nullable(),
});

export const teacherEarningsSummaryViewSchema = z.object({
  currency: egp,
  rows: z.array(teacherEarningsSummaryRowSchema),
  totals: z.object({
    earned: z.number(),
    paid: z.number(),
    owed: z.number(),
    teachers_owed: count(),
  }),
});

/** `replayed`: this clientRequestId had already been recorded. */
export const teacherPaymentResultSchema = z.object({
  payment: teacherPaymentViewSchema,
  replayed: z.boolean(),
});

export type TeacherEarningView = z.infer<typeof teacherEarningViewSchema>;
export type TeacherPaymentView = z.infer<typeof teacherPaymentViewSchema>;
export type EarningsBalance = z.infer<typeof earningsBalanceSchema>;
export type TeacherEarningsBalanceView = z.infer<typeof teacherEarningsBalanceViewSchema>;
export type TeacherEarningsSummaryRow = z.infer<typeof teacherEarningsSummaryRowSchema>;
export type TeacherEarningsSummaryView = z.infer<typeof teacherEarningsSummaryViewSchema>;
export type TeacherPaymentResult = z.infer<typeof teacherPaymentResultSchema>;
