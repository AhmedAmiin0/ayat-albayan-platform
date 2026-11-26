import { defineRoute } from '@ab/core';
import { catalogResponseSchema, priceListResponseSchema, quoteResponseSchema } from '@ab/money';
import { catalogQuerySchema, priceListQuerySchema, quoteQuerySchema } from './pricing.schemas';

/** The staff price calculator (docs/08), written once for the api and its clients. */
export const pricingRoutes = {
  catalog: defineRoute({
    method: 'GET',
    path: '/pricing/catalog',
    query: catalogQuerySchema,
    response: catalogResponseSchema,
  }),
  quote: defineRoute({
    method: 'GET',
    path: '/pricing/quote',
    query: quoteQuerySchema,
    response: quoteResponseSchema,
  }),
  list: defineRoute({
    method: 'GET',
    path: '/pricing/list',
    query: priceListQuerySchema,
    response: priceListResponseSchema,
  }),
};
