import { z } from 'zod';
import { localDate } from '../../schemas/lessons/scheduling.js';
import type { PaymentMethod } from '../../enums/index.js';
import { currencyIso, moneyAmount, subscriptionPricingSchema, type PaymentCreate } from '../../money/schemas.js';

// «رابط دفع» (owner 2026-10-28, docs/30-stripe-test.md; TEST BUILD ONLY): the assistant agrees an amount with
// the family in the chat and sends a Stripe Checkout link; the verified webhook records the payment. Strict
// objects, like the sales money commands: an unknown field is a 400, never silently dropped.

export const PAYMENT_LINK_KINDS = ['new', 'renewal'] as const;
export type PaymentLinkKind = (typeof PAYMENT_LINK_KINDS)[number];
export const PAYMENT_LINK_STATUSES = ['open', 'paid', 'expired', 'cancelled'] as const;
export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUSES)[number];
/** Checkout accepts the academy's two package currencies only. */
export const PAYMENT_LINK_CURRENCIES = ['SAR', 'USD'] as const;

/** POST /sales/payment-links/quote: the calculator price shown as the reference (any student). */
export const paymentLinkQuoteSchema = z.strictObject({ studentId: z.uuid(), pricing: subscriptionPricingSchema });

/**
 * POST /sales/payment-links: the package as the sales subscribe flow takes it (pricing, start day) plus the
 * agreed amount (free, > 0, at most settings max_discount_pct below the calculator price when set).
 */
export const paymentLinkCreateSchema = z.strictObject({
  studentId: z.uuid(),
  kind: z.enum(PAYMENT_LINK_KINDS),
  pricing: subscriptionPricingSchema,
  startsOn: localDate.optional(),
  alreadyStarted: z.boolean().optional(),
  amount: moneyAmount,
  currency: currencyIso,
  clientRequestId: z.uuid(),
});

/** GET /sales/payment-links?status=: her links, newest first. */
export const paymentLinkListSchema = z.object({ status: z.enum(PAYMENT_LINK_STATUSES).optional() });

const secretInput = z.string().trim().min(1).max(512);

/** PATCH /admin/stripe/settings: a key / secret is write-only; null clears it. */
export const stripeSettingsPatchSchema = z.strictObject({
  enabled: z.boolean().optional(),
  maxDiscountPct: z.number().min(0).max(100).nullable().optional(),
  apiKey: secretInput.nullable().optional(),
  webhookSecret: secretInput.nullable().optional(),
});

export type PaymentLinkQuote = z.output<typeof paymentLinkQuoteSchema>;
export type PaymentLinkCreate = z.output<typeof paymentLinkCreateSchema>;
export type StripeSettingsPatch = z.output<typeof stripeSettingsPatchSchema>;

/** What PaymentsService records: a form's payment, or one only the platform writes (method 'card'). */
export type PaymentWrite = Omit<PaymentCreate, 'method'> & { method: PaymentMethod };
