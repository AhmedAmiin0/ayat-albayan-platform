import { PACKAGE_SIZES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { listSortShape } from '@ab/core';
import {
  SUBSCRIPTION_SORT_KEYS,
  subscriptionPricingSchema,
  type SubscriptionPricing,
} from '@ab/money';
import { z } from 'zod';
import { pageQuerySchema } from '@/common/http/http';
import type { QuoteQuery } from '@ab/shared';

/** S1 (R-NFR-08): paid=partial means unpaid packages with at least one payment. */
export const subscriptionListQuery = pageQuerySchema.extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  studentId: z.uuid().optional(),
  paid: z.enum(['partial']).optional(),
  student: z.string().trim().min(1).max(100).optional(),
  package: z.enum(PACKAGE_SIZES).optional(),
  ...listSortShape(SUBSCRIPTION_SORT_KEYS),
});

/** POST /subscriptions/quote: the price S2 would store, for the create dialog (never typed). */
export const subscriptionQuoteSchema = z.object({
  studentId: z.uuid(),
  pricing: subscriptionPricingSchema,
});
export type SubscriptionQuote = z.output<typeof subscriptionQuoteSchema>;

/** The calculator inputs → one student's quote (S2 step 2): `students: 1`, country resolved. */
export function quoteQueryFor(p: SubscriptionPricing, country: string | undefined): QuoteQuery {
  const common = { duration: p.duration, discount: p.discount, students: 1, country };
  return 'tier' in p ? { ...common, tier: p.tier } : { ...common, count: p.count };
}
