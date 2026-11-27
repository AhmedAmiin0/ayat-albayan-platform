import { PACKAGE_SIZES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { listSortShape, pageQuery } from '@ab/core';
import { SUBSCRIPTION_SORT_KEYS, subscriptionPricingSchema } from '@ab/money';
import { z } from 'zod';

/** GET /subscriptions (R-NFR-08): paid=partial means unpaid packages with at least one payment. */
export const subscriptionListQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  studentId: z.uuid().optional(),
  paid: z.enum(['partial']).optional(),
  student: z.string().trim().min(1).max(100).optional(),
  package: z.enum(PACKAGE_SIZES).optional(),
  ...listSortShape(SUBSCRIPTION_SORT_KEYS),
});
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;
export type SubscriptionListQueryInput = z.input<typeof subscriptionListQuerySchema>;

/** POST /subscriptions/quote: the price the create would store, for its dialog (never typed). */
export const subscriptionQuoteSchema = z.object({
  studentId: z.uuid(),
  pricing: subscriptionPricingSchema,
});
export type SubscriptionQuote = z.output<typeof subscriptionQuoteSchema>;
