import type { RouteResult } from '@ab/core';
import type { CatalogQueryInput, pricingRoutes, QuoteQueryInput } from '@ab/shared';

type Answer<K extends keyof typeof pricingRoutes> = Promise<RouteResult<(typeof pricingRoutes)[K]>>;

export interface PricingCalls {
  catalog: (query: CatalogQueryInput) => Answer<'catalog'>;
  quote: (query: QuoteQueryInput) => Answer<'quote'>;
}
