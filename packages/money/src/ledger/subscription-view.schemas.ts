import { DURATIONS, PACKAGE_SIZES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { pageOf } from '@ab/core';
import { z } from 'zod';

// Money answers of docs/11 §5–9: snake_case rows, ISO UTC instants, money as numbers with at most
// 2 decimals, local dates YYYY-MM-DD.

/** One v_subscription_balance row (R-SUB-01, R-SUB-03). */
export const balanceViewSchema = z.object({
  subscription_id: z.string(),
  lessons_total: z.number(),
  lessons_used: z.number(),
  /** Negative only on the newest package: lessons attended past every package. */
  remaining: z.number(),
  ended_at: z.string().nullable(),
  projected_end_at: z.string().nullable(),
});

export const subscriptionViewSchema = z.object({
  id: z.string(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  /** null = a custom lesson count. */
  package: z.enum(PACKAGE_SIZES).nullable(),
  duration: z.literal(DURATIONS),
  lessons_total: z.number(),
  /** Taken before the platform, counted in balance.lessons_used. */
  lessons_used_before: z.number().optional(),
  /** Per student, after discount, in `currency` (quote.afterDiscount for students = 1). */
  price: z.number(),
  currency: z.string(),
  fx_rate: z.number().nullable(),
  fx_date: z.string().nullable(),
  /**
   * The catalog quote the price came from (docs/08 §4), or the sheet row of an imported package
   * (docs/06), so its shape stays open and readers check each field (renewalPricing).
   */
  price_source: z.record(z.string(), z.unknown()),
  starts_on: z.string(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  /** A cancelled package's kind, 'unused' or 'stopped' (still owed: countsForMoney). */
  cancel_kind: z.string().nullish(),
  /** A stopped course's stored decision: what it is owed for (owedFor); null otherwise. */
  stop_owed_amount: z.number().nullish(),
  renews_on: z.string().nullable(),
  notes: z.string().nullable(),
  /** Sum of payments in `currency`. */
  paid: z.number(),
  balance: balanceViewSchema,
  created_at: z.string(),
});

export const subscriptionPageSchema = pageOf(subscriptionViewSchema);

/** GET /students/:id/balance: the student's packages, oldest first, and the total left. */
export const studentBalanceViewSchema = z.object({
  student_id: z.string(),
  /** studentRemaining(packages). */
  remaining: z.number(),
  /** The newest package, which alerts and lesson flags follow; null without packages. */
  current: subscriptionViewSchema.nullable(),
  packages: z.array(subscriptionViewSchema),
});

/** GET /students/:id/balance for a teacher: lessons only, never price, paid, fx or the quote. */
export const teacherBalanceViewSchema = studentBalanceViewSchema
  .pick({ student_id: true, remaining: true })
  .extend({ packages: z.array(balanceViewSchema) });

export const studentBalanceAnswerSchema = z.union([
  studentBalanceViewSchema,
  teacherBalanceViewSchema,
]);

export type BalanceView = z.infer<typeof balanceViewSchema>;
export type SubscriptionView = z.infer<typeof subscriptionViewSchema>;
export type SubscriptionPage = z.infer<typeof subscriptionPageSchema>;
export type StudentBalanceView = z.infer<typeof studentBalanceViewSchema>;
export type TeacherBalanceView = z.infer<typeof teacherBalanceViewSchema>;
export type StudentBalanceAnswer = z.infer<typeof studentBalanceAnswerSchema>;
