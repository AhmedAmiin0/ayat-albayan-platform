import { z } from 'zod';
import { ALL_PAYMENT_METHODS, PAYOUT_STATUSES } from '@ab/catalog';
import { payoutBreakdownSchema } from '../earnings/payout-breakdown.schemas';

// Teacher payouts (docs/11 §8): teacher money is always EGP; month is YYYY-MM.

export const payoutViewSchema = z.object({
  id: z.string(),
  teacher: z.object({ id: z.string(), display_name_ar: z.string() }),
  month: z.string(),
  lessons_count: z.number(),
  amount: z.number(),
  currency: z.literal('EGP'),
  status: z.enum(PAYOUT_STATUSES),
  approved_at: z.string().nullable(),
  paid_at: z.string().nullable(),
  breakdown: payoutBreakdownSchema,
  /** Open payouts only: already paid per session (docs/11 §10), so due = amount − ledger_paid. */
  ledger_paid: z.number().optional(),
  method: z.enum(ALL_PAYMENT_METHODS).nullish(),
  note: z.string().nullish(),
  has_receipt: z.boolean().optional(),
});

/** GET /payouts?month and GET /teachers/me/payouts. */
export const payoutListSchema = z.array(payoutViewSchema);

/** POST /payouts/:month/generate: draft rows written, and teachers skipped for a missing rate. */
export const payoutGenerateResultSchema = z.object({
  month: z.string(),
  payouts: z.array(payoutViewSchema),
  missing_rates: z.array(
    z.object({
      teacher_id: z.string(),
      display_name_ar: z.string(),
      durations: z.array(z.number()),
    }),
  ),
});

export type PayoutView = z.infer<typeof payoutViewSchema>;
export type PayoutGenerateResult = z.infer<typeof payoutGenerateResultSchema>;
