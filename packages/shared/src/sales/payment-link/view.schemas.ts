import { DURATIONS, PACKAGE_SIZES } from '@ab/catalog';
import { quoteSchema } from '@ab/money';
import { z } from 'zod';
import { PAYMENT_LINK_STATUSES, paymentLinkKindSchema, paymentLinkStatusSchema } from './schemas';

/** One payment link as its assistant (or an admin) sees it; the token appears only in `url`. */
export const paymentLinkViewSchema = z.object({
  id: z.string(),
  /** https://<api>/pay/<token>: what she sends in the chat. */
  url: z.string(),
  kind: paymentLinkKindSchema,
  status: paymentLinkStatusSchema,
  amount: z.number(),
  currency: z.string(),
  /** The calculator price of the package when the link was made. */
  reference_price: z.number(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  subscription_id: z.string().nullable(),
  /** null = a custom lesson count. */
  package: z.enum(PACKAGE_SIZES).nullable(),
  lessons: z.number(),
  duration: z.literal(DURATIONS),
  expires_at: z.string(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
});
export type PaymentLinkView = z.infer<typeof paymentLinkViewSchema>;

/**
 * POST /sales/payment-links/quote: the price she tells the family and the admin's cap. Never the fx
 * internals or the quote source (docs/16).
 */
export const paymentLinkQuoteViewSchema = z.object({
  quote: quoteSchema.pick({
    package: true,
    lessons: true,
    duration: true,
    currency: true,
    discount: true,
    afterDiscount: true,
    perLesson: true,
  }),
  /** settings max_discount_pct; null = no cap. */
  max_discount_pct: z.number().nullable(),
  /** The lowest amount allowed; null = anything above 0. */
  min_amount: z.number().nullable(),
});
export type PaymentLinkQuoteView = z.infer<typeof paymentLinkQuoteViewSchema>;

/** A link's status on its public page: `processing` is an async payment still pending. */
export const publicLinkStatusSchema = z.enum([...PAYMENT_LINK_STATUSES, 'processing']);
export type PublicLinkStatus = z.infer<typeof publicLinkStatusSchema>;

/** GET /pay/:token (public): no personal data beyond the first name. */
export const publicPaymentLinkSchema = z.object({
  status: publicLinkStatusSchema,
  first_name: z.string(),
  amount: z.number(),
  currency: z.string(),
  package: z.enum(PACKAGE_SIZES).nullable(),
  lessons: z.number(),
  /** The server's Stripe key is a sandbox one: the page says it is a test (live: no notice). */
  sandbox: z.boolean(),
});
export type PublicPaymentLink = z.infer<typeof publicPaymentLinkSchema>;
