import { z } from 'zod';
import { PAYMENT_KINDS, PAYMENT_METHODS } from '../enums/index.js';
import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  DISCOUNT_MAX,
  PACKAGE_IDS,
  PRICING_DURATIONS,
} from '../pricing/catalog.js';
import { optionalText } from '../schemas/common.js';
import { instant, localDate } from '../schemas/lessons/scheduling.js';

// Money commands (docs/11 §5–8). camelCase like every command. No client ever sends a price:
// a subscription is priced by the API from the catalog (docs/08), the same quote as /pricing.

/** `YYYY-MM` in routes and queries; stored as the month's first day (monthStart). */
export const monthParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'invalid_month');
export function monthStart(month: string): string {
  return `${month}-01`;
}

/** ISO 4217, upper case. */
export const currencyIso = z.string().regex(/^[A-Z]{3}$/, 'invalid_currency');

/** A positive amount with at most 2 decimals (numeric(12,2)). */
export const moneyAmount = z
  .number()
  .positive()
  .max(9_999_999_999)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, { message: 'too_many_decimals' });

const pricingBase = {
  duration: z.literal(PRICING_DURATIONS).default(DEFAULT_DURATION),
  /** ISO 3166 alpha-2; omitted → the guardian's country; not a site country → USD (docs/08 §1). */
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase())
    .optional(),
  /** Percent, 0–100: the calculator's pills or its free field. */
  discount: z.number().min(0).max(DISCOUNT_MAX).default(0),
};

/** The calculator inputs for ONE student (a family buys one subscription per child). */
export const subscriptionPricingSchema = z.xor([
  z.object({ ...pricingBase, tier: z.enum(PACKAGE_IDS) }),
  z.object({ ...pricingBase, count: z.int().min(CUSTOM_COUNT_MIN).max(CUSTOM_COUNT_MAX) }),
]);

export const LESSONS_USED_BEFORE_MAX = 99; // schema bound; the real one is lessons_total − 1 (usedBeforeProblem)
/** POST /subscriptions (R-SUB-01). */
export const subscriptionCreateSchema = z.object({
  studentId: z.uuid(),
  pricing: subscriptionPricingSchema,
  startsOn: localDate,
  renewsOn: localDate.nullish(),
  notes: optionalText,
  /** Lessons taken before the platform (owner 2026-10-28): only with a past startsOn (usedBeforeProblem). */
  lessonsUsedBefore: z.int().min(0).max(LESSONS_USED_BEFORE_MAX).optional(),
  clientRequestId: z.uuid().optional(), // rule 8: a retry of the same form returns its package
});

/** PATCH /subscriptions/:id. Only what an admin may set; price and size never change. */
export const subscriptionUpdateSchema = z.object({
  /** true → paused; false → back to the derived status (subscriptionStatusFor). */
  paused: z.boolean().optional(),
  renewsOn: localDate.nullable().optional(),
  notes: optionalText,
});

/** Payment dates may not be in the future (5 minutes of clock skew allowed). */
export const pastInstant = instant.refine((v) => Date.parse(v) <= Date.now() + 300_000, {
  message: 'paid_at_future',
});

/** «المرفقات» of a bank transfer (owner 2026-10-12): at most this many files per payment, all optional. */
export const PAYMENT_ATTACHMENTS_MAX = 5;
/**
 * Paths from the receipt upload URL (receipts/{subscription_id}/…). Accepted ONLY when the method is 'bank'
 * (the API answers 400 attachments_not_allowed otherwise); each must be the package's, uploaded and an image / PDF.
 */
export const paymentAttachmentPaths = z.array(z.string().min(1).max(200)).max(PAYMENT_ATTACHMENTS_MAX, { message: 'too_many_attachments' });

/**
 * POST /payments (R-PAY-01). receiptPath comes from POST /payments/receipt-upload-url. `currency`
 * may differ from the package's when an fx rate exists (stored converted, original kept);
 * kind 'refund' («استرداد»): a positive amount counted against what was paid. invoiceId: the
 * booking's invoice is the receipt («سجّل كدفعة»).
 */
export const paymentCreateSchema = z.object({
  subscriptionId: z.uuid(),
  amount: moneyAmount,
  currency: currencyIso,
  kind: z.enum(PAYMENT_KINDS).default('payment'),
  invoiceId: z.uuid().optional(),
  method: z.enum(PAYMENT_METHODS),
  paidAt: pastInstant,
  receiptPath: z.string().min(1).nullish(),
  attachments: paymentAttachmentPaths.optional(),
  note: optionalText,
  /**
   * Made once per payment form and re-sent on every retry: a POST whose reply was lost returns
   * the payment already recorded instead of recording it twice (rule 8).
   */
  clientRequestId: z.uuid().optional(),
});

/** PATCH /payments/:id: explicit optionals (a .partial() would re-apply defaults). */
export const paymentUpdateSchema = z.object({
  amount: moneyAmount.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  paidAt: pastInstant.optional(),
  receiptPath: z.string().min(1).nullable().optional(),
  note: optionalText,
});

export const RECEIPT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'] as const;
/** Same as the receipts bucket limit (migration 122). */
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

/** POST /payments/receipt-upload-url (R-PAY-01, R-MOB-02 camera). */
export const receiptUploadSchema = z.object({
  subscriptionId: z.uuid(),
  mime: z.enum(RECEIPT_MIMES, { message: 'receipt_type' }),
  size: z.int().min(1).max(RECEIPT_MAX_BYTES, { message: 'receipt_too_large' }),
});

/** POST /payouts/:id/pay. Approve takes no body. */
export const payoutPaySchema = z.object({ paidAt: pastInstant.optional(), method: z.enum(PAYMENT_METHODS).optional(), note: optionalText, receiptPath: z.string().min(1).nullish() });

/** `?from&to` local days (Asia/Riyadh), inclusive, at most a year (else range_too_large). */
export const dateRangeQuery = z
  .object({ from: localDate, to: localDate })
  .refine((r) => r.from <= r.to, { message: 'invalid_range', path: ['to'] })
  .refine((r) => Date.parse(r.to) - Date.parse(r.from) <= 366 * 86_400_000, {
    message: 'range_too_large',
    path: ['to'],
  });

export const monthQuery = z.object({ month: monthParam });

export type SubscriptionPricing = z.output<typeof subscriptionPricingSchema>;
export type SubscriptionCreate = z.output<typeof subscriptionCreateSchema>;
export type SubscriptionUpdate = z.output<typeof subscriptionUpdateSchema>;
export type PaymentCreate = z.output<typeof paymentCreateSchema>;
export type PaymentUpdate = z.output<typeof paymentUpdateSchema>;
export type ReceiptUpload = z.output<typeof receiptUploadSchema>;
export type PayoutPay = z.output<typeof payoutPaySchema>;
export type DateRangeQuery = z.output<typeof dateRangeQuery>;
