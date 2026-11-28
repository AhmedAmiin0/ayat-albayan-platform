import { z } from 'zod';

export const AGING_BUCKETS = ['0_30', '31_60', '61_90', '90_plus'] as const;
export const agingBucketSchema = z.enum(AGING_BUCKETS);
export type AgingBucket = z.infer<typeof agingBucketSchema>;

export const receivableInSchema = z.object({
  id: z.string(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  guardian: z.object({ name: z.string(), phone_e164: z.string().nullable() }).nullable(),
  price: z.number(),
  currency: z.string(),
  /** The package's first day (YYYY-MM-DD): what is owed is due from then. */
  starts_on: z.string(),
  status: z.string(),
  /** A stopped package owes stop_owed_amount, not its price (owedFor). */
  cancel_kind: z.string().nullish(),
  /** The stop's stored decision (migration 20261106000100); null for a package not stopped. */
  stop_owed_amount: z.number().nullish(),
});
export type ReceivableIn = z.infer<typeof receivableInSchema>;

export const receivableRowSchema = receivableInSchema.extend({
  paid: z.number(),
  owed: z.number(),
  days_overdue: z.number(),
  bucket: agingBucketSchema,
});
export type ReceivableRow = z.infer<typeof receivableRowSchema>;

export const receivableTotalSchema = z.object({
  currency: z.string(),
  owed: z.number(),
  buckets: z.object({
    '0_30': z.number(),
    '31_60': z.number(),
    '61_90': z.number(),
    '90_plus': z.number(),
  }),
});
export type ReceivableTotal = z.infer<typeof receivableTotalSchema>;

/** GET /receivables. */
export const receivablesViewSchema = z.object({
  rows: z.array(receivableRowSchema),
  totals: z.array(receivableTotalSchema),
  /** Every currency's owed, in `currency` (settings.reporting_currency). */
  total: z.number(),
  currency: z.string(),
  fx_missing: z.array(z.string()),
});
export type ReceivablesView = z.infer<typeof receivablesViewSchema>;
