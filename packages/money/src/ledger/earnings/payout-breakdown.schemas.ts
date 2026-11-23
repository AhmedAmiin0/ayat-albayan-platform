import { z } from 'zod';
import { LESSON_STATUSES } from '@ab/catalog';

export const payoutLineSchema = z.object({
  /** Minutes: 30/45/60/90, or another length pro-rated from the nearest rate (pay-rule.ts). */
  duration: z.number().positive(),
  lessons: z.int().nonnegative(),
  /** null = the teacher has no rate for this duration (see missingRates). */
  rate: z.number().nullable(),
  amount: z.number(),
});

/**
 * teacher_payouts.breakdown: the column default is `{}` and the ledger SQL coalesces a missing
 * lesson_ids to `[]`, so an absent key reads empty; a key of the wrong shape is refused, since
 * lesson_ids decide which sessions a payout pays.
 */
export const payoutBreakdownSchema = z.object({
  lines: z.array(payoutLineSchema).default([]),
  lesson_ids: z.array(z.string().min(1)).default([]),
  statuses: z.array(z.enum(LESSON_STATUSES)).default([]),
});

export type PayoutLine = z.infer<typeof payoutLineSchema>;
export type PayoutBreakdownView = z.infer<typeof payoutBreakdownSchema>;
