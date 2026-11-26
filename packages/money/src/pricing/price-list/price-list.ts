import {
  DEFAULT_DURATION,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  WEEKLY,
  type PackageId,
  type PricingDuration,
} from '../catalog';
import { quote } from '../quote';
import type { PriceList } from './price-list.schemas';
import type { PriceListOptions } from './price-list.types';

/** Weekly has one price whatever the duration, so it is listed once, outside the groups. */
const PER_DURATION = PACKAGE_IDS.filter((id) => id !== WEEKLY.id);

/**
 * The whole price list of one country (docs/08 §3b). Every entry is quote() for that package, so
 * a list price always equals the single quote for the same country, students, discount and
 * rounding.
 */
export function priceList(o: PriceListOptions): PriceList {
  const priced = (tier: PackageId, duration: PricingDuration) => quote({ ...o, tier, duration });
  const weekly = priced(WEEKLY.id, DEFAULT_DURATION);
  return {
    country: weekly.country,
    currency: weekly.currency,
    students: o.students,
    discount: o.discount,
    groups: PRICING_DURATIONS.map((duration) => ({
      duration,
      packages: PER_DURATION.map((tier) => priced(tier, duration)),
    })),
    weekly,
  };
}
