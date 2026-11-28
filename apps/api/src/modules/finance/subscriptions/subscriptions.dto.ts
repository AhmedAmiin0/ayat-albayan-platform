import type { SubscriptionPricing } from '@ab/money';
import type { QuoteQuery } from '@ab/shared';

/** The calculator inputs → one student's quote (S2 step 2): `students: 1`, country resolved. */
export function quoteQueryFor(p: SubscriptionPricing, country: string | undefined): QuoteQuery {
  const common = { duration: p.duration, discount: p.discount, students: 1, country };
  return 'tier' in p ? { ...common, tier: p.tier } : { ...common, count: p.count };
}
