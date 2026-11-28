import type { PriceListResponse, Rounding } from '@ab/money';
import type { pricingRoutes } from '@ab/shared';
import type { RouteQueryContext } from '../../core/query';

/** What the quote sheet chose; the list itself has every duration and package. */
export interface PriceListChoice {
  /** A site country; anything else (the sheets' 'other', or null) is listed in USD. */
  country: string | null;
  students: number;
  /** Percent, 0 to 100, as a number: a pill or the parsed free field. */
  discount: number;
  rounding: Rounding;
}

export type PriceListKeys = (typeof pricingRoutes)['list']['key'];

export interface PriceListQuery {
  queryKey: unknown[];
  queryFn: (context?: RouteQueryContext) => Promise<PriceListResponse>;
}
