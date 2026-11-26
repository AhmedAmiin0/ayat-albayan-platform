import { priceListResponseSchema, siteCountry } from '@ab/money';
import { parseResponse, toQueryString, type ApiClient } from '../../core/http';
import type { ListParams } from '../../core/keys';
import { PRICE_LIST_PATH, priceListKeys } from './price-list.keys';
import type { PriceListChoice, PriceListQuery } from './price-list.types';

/**
 * The query of GET /pricing/list. The country is left out for anything but a site country: the
 * API then lists USD, and it refuses an empty `country=`.
 */
export function priceListParams(choice: PriceListChoice): ListParams {
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
export function priceListQueryOptions(
  client: Pick<ApiClient, 'apiFetch'>,
  choice: PriceListChoice,
): PriceListQuery {
  const params = priceListParams(choice);
  const url = `${PRICE_LIST_PATH}${toQueryString(params)}`;
  return {
    queryKey: priceListKeys.of(params),
    queryFn: async () => parseResponse(priceListResponseSchema, await client.apiFetch(url), url),
  };
}
