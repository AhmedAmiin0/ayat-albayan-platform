import { siteCountry } from '@ab/money';
import { pricingRoutes, type PriceListQueryInput } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ListParams } from '../../core/keys';
import { priceListKeys } from './price-list.keys';
import type { PriceListChoice, PriceListQuery } from './price-list.types';

/**
 * The query of GET /pricing/list. The country is left out for anything but a site country: the
 * API then lists USD, and it refuses an empty `country=`.
 */
export function priceListParams(choice: PriceListChoice): ListParams & PriceListQueryInput {
  return {
    country: siteCountry(choice.country) ?? undefined,
    students: choice.students,
    discount: choice.discount,
    rounding: choice.rounding,
  };
}

/**
 * The whole price list for one choice; the client never prices anything itself. The sheets add
 * `placeholderData: keepPreviousData`, whose `isPlaceholderData` is what blocks sending a stale
 * list while the next one loads.
 */
export function priceListQueryOptions(client: ApiClient, choice: PriceListChoice): PriceListQuery {
  const params = priceListParams(choice);
  const call = callWith(client);
  return {
    queryKey: priceListKeys.of(params),
    queryFn: () => call({ route: pricingRoutes.list, query: params }),
  };
}
