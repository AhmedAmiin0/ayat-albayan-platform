import { z } from 'zod';
import { ALL_PAYMENT_METHODS, PAYMENT_KINDS } from '@ab/catalog';
import { pageOf } from '@ab/core';

// The money answers of docs/11 §7: snake_case rows, ISO UTC instants, money as numbers.

const studentRefSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });

export const paymentViewSchema = z.object({
  id: z.string(),
  subscription_id: z.string(),
  student: studentRefSchema,
  amount: z.number(),
  currency: z.string(),
  method: z.enum(ALL_PAYMENT_METHODS),
  paid_at: z.string(),
  /** Storage path in the receipts bucket; GET /payments/:id/receipt signs it. */
  receipt_path: z.string().nullable(),
  recorded_by: z.object({ id: z.string(), full_name: z.string() }).nullable(),
  note: z.string().nullable(),
  created_at: z.string(),
  /** A refund counts against what was paid. */
  kind: z.enum(PAYMENT_KINDS),
  /** What the family sent when it was another currency (amount/currency are the package's). */
  original: z.object({ amount: z.number(), currency: z.string(), fx_rate: z.number() }).nullable(),
  /** Recorded from the booking's invoice: the invoice is the receipt. */
  invoice_id: z.string().nullable(),
});

/** A signed attachment (1 h); a pre-attachments payment shows receipt_path as legacy 'receipt'. */
export const paymentAttachmentViewSchema = z.object({
  id: z.string(),
  mime: z.string().nullable(),
  size: z.number().nullable(),
  url: z.string(),
  expires_at: z.string(),
  legacy: z.boolean(),
});

/** GET /payments/:id/attachments. */
export const paymentAttachmentListSchema = z.array(paymentAttachmentViewSchema);

/** One currency's net on GET /payments (payments minus refunds). */
export const periodTotalSchema = z.object({
  currency: z.string(),
  net: z.number(),
  payments: z.number(),
  refunds: z.number(),
});

/** GET /payments: a page of payments plus the filter's totals per currency. */
export const paymentsPageSchema = pageOf(paymentViewSchema).extend({
  totals: z.array(periodTotalSchema),
});

export type PaymentView = z.infer<typeof paymentViewSchema>;
export type PaymentAttachmentView = z.infer<typeof paymentAttachmentViewSchema>;
export type PeriodTotal = z.infer<typeof periodTotalSchema>;
export type PaymentsPage = z.infer<typeof paymentsPageSchema>;
