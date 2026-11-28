import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { paymentLinkCreateSchema, paymentLinkListSchema, paymentLinkQuoteSchema } from './schemas';
import { paymentLinkQuoteViewSchema, paymentLinkViewSchema } from './view.schemas';

const access = { permissions: ['self.sales_money'], tags: ['sales'] } as const;

/** Stripe payment links (docs/30), written once for the api and its clients. */
export const paymentLinkRoutes = {
  quote: defineRoute({
    method: 'POST',
    path: '/sales/payment-links/quote',
    body: paymentLinkQuoteSchema,
    response: paymentLinkQuoteViewSchema,
    ...access,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/sales/payment-links',
    body: paymentLinkCreateSchema,
    response: paymentLinkViewSchema,
    ...access,
  }),
  list: defineRoute({
    method: 'GET',
    path: '/sales/payment-links',
    query: paymentLinkListSchema,
    response: z.array(paymentLinkViewSchema),
    ...access,
  }),
  cancel: defineRoute({
    method: 'POST',
    path: '/sales/payment-links/:id/cancel',
    params: z.object({ id: id() }),
    response: paymentLinkViewSchema,
    ...access,
  }),
};
