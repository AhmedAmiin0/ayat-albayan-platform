import {
  listSortShape,
  PACKAGE_SIZES,
  SUBSCRIPTION_SORT_KEYS,
  SUBSCRIPTION_STATUSES,
  subscriptionPricingSchema,
  type SubscriptionPricing,
} from '@ab/shared';
import { z } from 'zod';
import { pageQuerySchema } from '../../common/http/http';
import type { QuoteQuery } from '../pricing/pricing.dto';

/**
 * GET /subscriptions?status&studentId&paid&student&package&sort&dir&page&pageSize (S1, R-NFR-08).
 * `paid=partial` («مدفوع جزئيًا»): unpaid packages with at least one payment (the exact
 * 0 < paid < price is derived per row). `student`: part of the student's name.
 */
export const subscriptionListQuery = pageQuerySchema.extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  studentId: z.uuid().optional(),
  paid: z.enum(['partial']).optional(),
  student: z.string().trim().min(1).max(100).optional(),
  package: z.enum(PACKAGE_SIZES).optional(),
  ...listSortShape(SUBSCRIPTION_SORT_KEYS),
});

/** POST /subscriptions/quote: the price S2 would store, for the create dialog (never typed). */
export const subscriptionQuoteSchema = z.object({ studentId: z.uuid(), pricing: subscriptionPricingSchema });
export type SubscriptionQuote = z.output<typeof subscriptionQuoteSchema>;

/** GET /admin-tasks?open=true&page&pageSize (S7). */
export const adminTaskListQuery = pageQuerySchema.extend({
  open: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
});

/** The calculator inputs → one student's quote (S2 step 2): `students: 1`, country resolved. */
export function quoteQueryFor(p: SubscriptionPricing, country: string | undefined): QuoteQuery {
  const common = { duration: p.duration, discount: p.discount, students: 1, country };
  return 'tier' in p ? { ...common, tier: p.tier } : { ...common, count: p.count };
}
