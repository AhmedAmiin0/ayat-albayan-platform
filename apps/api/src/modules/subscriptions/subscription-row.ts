import type { Json, TablesInsert } from '@ab/db';
import { TIER_PACKAGE_SIZE, type QuoteResponse, type SubscriptionCreate } from '@ab/shared';

/**
 * S2 step 3: the subscriptions row from the catalog quote, never from a typed price (R-SUB-01,
 * docs/08 §4). A new package starts `unpaid`; the recompute right after derives its status.
 */
export function subscriptionRow(
  input: SubscriptionCreate,
  quote: QuoteResponse,
  actorId: string,
): TablesInsert<'subscriptions'> {
  return {
    student_id: input.studentId,
    package: 'tier' in input.pricing ? TIER_PACKAGE_SIZE[input.pricing.tier] : null,
    duration: quote.duration,
    lessons_total: quote.lessons,
    price: quote.afterDiscount,
    currency: quote.currency,
    fx_rate: quote.fx?.rate ?? null,
    fx_date: quote.fx?.date ?? null,
    price_source: quote as unknown as NonNullable<Json>,
    starts_on: input.startsOn,
    status: 'unpaid',
    renews_on: input.renewsOn ?? null,
    notes: input.notes ?? null,
    created_by: actorId,
  };
}
