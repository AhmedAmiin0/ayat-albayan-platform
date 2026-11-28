import { defineRoute } from '@ab/core';
import { catalogResponseSchema, priceListResponseSchema, quoteResponseSchema } from '@ab/money';
import {
  catalogQuerySchema,
  priceListPdfBodySchema,
  priceListPdfResponseSchema,
  priceListQuerySchema,
  quoteQuerySchema,
} from './pricing.schemas';

const access = { permissions: ['pricing.read'], tags: ['pricing'] } as const;

/** The staff price calculator (docs/08), written once for the api and its clients. */
export const pricingRoutes = {
  catalog: defineRoute({
    method: 'GET',
    path: '/pricing/catalog',
    query: catalogQuerySchema,
    response: catalogResponseSchema,
    ...access,
  }),
  quote: defineRoute({
    method: 'GET',
    path: '/pricing/quote',
    query: quoteQuerySchema,
    response: quoteResponseSchema,
    ...access,
  }),
  list: defineRoute({
    method: 'GET',
    path: '/pricing/list',
    query: priceListQuerySchema,
    response: priceListResponseSchema,
    ...access,
  }),
  /** The same list as a branded PDF, stored for the chat's file send (docs/08 §3b). */
  listPdf: defineRoute({
    method: 'POST',
    path: '/pricing/list-pdf',
    body: priceListPdfBodySchema,
    response: priceListPdfResponseSchema,
    ...access,
  }),
};
