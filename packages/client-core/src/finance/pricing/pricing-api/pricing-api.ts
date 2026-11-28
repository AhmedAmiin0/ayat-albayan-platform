import { pricingRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PricingCalls } from './pricing-api.types';

/** The staff price calculator (docs/08) on one api client; paths and answers from the routes. */
export function pricingCalls(client: ApiClient): PricingCalls {
  const call = callWith(client);
  return {
    catalog: (query) => call({ route: pricingRoutes.catalog, query }),
    quote: (query) => call({ route: pricingRoutes.quote, query }),
  };
}
