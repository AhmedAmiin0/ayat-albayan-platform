import type { Json, TablesInsert } from '@ab/db';
import { TIER_PACKAGE_SIZE, type QuoteResponse, type SubscriptionCreate } from '@ab/shared';

/**
 * «مبلغ مخصص» (owner 2026-11-02): the quote stays in price_source for reference, marked
 * `source: 'custom'` with the price it replaced (`quoted`); the commission runs on `price`.
 */
function priced(quote: QuoteResponse, customPrice: number | undefined) {
  const quoted = quote.afterDiscount;
  const source = customPrice === undefined ? quote : { ...quote, source: 'custom', quoted };
  const price_source = source as unknown as NonNullable<Json>;
  return { price: customPrice ?? quoted, price_source };
}

/**
 * S2 step 3: the subscriptions row from the catalog quote (R-SUB-01, docs/08 §4), or the
 * «مبلغ مخصص» typed beside it. A new package starts `unpaid`; the recompute derives its status.
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
    lessons_used_before: input.lessonsUsedBefore ?? 0,
    ...priced(quote, input.customPrice),
    currency: quote.currency,
    fx_rate: quote.fx?.rate ?? null,
    fx_date: quote.fx?.date ?? null,
    starts_on: input.startsOn,
    status: 'unpaid',
    renews_on: input.renewsOn ?? null,
    notes: input.notes ?? null,
    created_by: actorId,
    client_request_id: input.clientRequestId ?? null,
  };
}
