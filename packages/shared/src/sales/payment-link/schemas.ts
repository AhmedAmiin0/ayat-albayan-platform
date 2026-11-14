import { z } from 'zod';
import { localDate } from '../../schemas/index.js';
import type { PaymentMethod } from '@ab/catalog';
import { currencyIso, LESSONS_USED_BEFORE_MAX, moneyAmount, subscriptionPricingSchema, type PaymentCreate } from '@ab/money';

// «رابط دفع» (owner 2026-10-28, docs/30-stripe-test.md; with FEATURE_STRIPE (test or live)): the assistant agrees an amount with
// the family in the chat and sends a Stripe Checkout link; the verified webhook records the payment. Strict
// objects, like the sales money commands: an unknown field is a 400, never silently dropped.

export const PAYMENT_LINK_KINDS = ['new', 'renewal'] as const;
export type PaymentLinkKind = (typeof PAYMENT_LINK_KINDS)[number];
export const PAYMENT_LINK_STATUSES = ['open', 'paid', 'expired', 'cancelled'] as const;
export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUSES)[number];
/**
 * The package currencies a link may carry: the 2-decimal ones (toMinorUnits ×100 is exact).
 * KWD and OMR (3 decimals) stay out until Checkout, the webhook and refunds use per-currency
 * minor units; the API refuses them before any package is made (400 currency_not_supported).
 * Migration 20261115000100 holds the same list in payment_links_currency_check.
 */
export const PAYMENT_LINK_CURRENCIES = ['SAR', 'AED', 'QAR', 'USD'] as const;
type PaymentLinkCurrency =(typeof PAYMENT_LINK_CURRENCIES)[number];
const linkCurrencySchema = z.enum(PAYMENT_LINK_CURRENCIES);

/** Whether a payment link can be made in this package currency. */
export const isLinkCurrency = (currency: string): currency is PaymentLinkCurrency =>
  linkCurrencySchema.safeParse(currency).success;

/** POST /sales/payment-links/quote: the calculator price shown as the reference (any student). */
export const paymentLinkQuoteSchema = z.strictObject({ studentId: z.uuid(), pricing: subscriptionPricingSchema });

/**
 * POST /sales/payment-links: the package as the sales subscribe flow takes it (pricing, start day, used
 * lessons, teacher: «اشتراك جديد» then «دفع إلكتروني», owner 2026-10-29) plus the agreed amount (free, > 0,
 * at most settings max_discount_pct below the calculator price when set).
 */
export const paymentLinkCreateSchema = z.strictObject({
  studentId: z.uuid(),
  /** Optional (owner 2026-10-29): the API stores 'renewal' once the student has a priced package, else 'new'. */
  kind: z.enum(PAYMENT_LINK_KINDS).optional(),
  pricing: subscriptionPricingSchema,
  startsOn: localDate.optional(),
  alreadyStarted: z.boolean().optional(),
  /** «حلقات مستخدمة من الباقة»: only with alreadyStarted (salesStartsOn), at most usedBeforeMax: every lesson but one. */
  lessonsUsedBefore: z.int().min(0).max(LESSONS_USED_BEFORE_MAX).optional(),
  /** «المعلم/ة»: students.teacher_id once the link is made, as POST /sales/subscriptions. */
  teacherId: z.uuid().optional(),
  amount: moneyAmount,
  currency: currencyIso,
  clientRequestId: z.uuid(),
});

/** GET /sales/payment-links?status=: her links, newest first. */
export const paymentLinkListSchema = z.object({ status: z.enum(PAYMENT_LINK_STATUSES).optional() });

export type PaymentLinkQuote = z.output<typeof paymentLinkQuoteSchema>;
export type PaymentLinkCreate = z.output<typeof paymentLinkCreateSchema>;

/** What PaymentsService records: a form's payment, or one only the platform writes (method 'card'). */
export type PaymentWrite = Omit<PaymentCreate, 'method'> & { method: PaymentMethod };
