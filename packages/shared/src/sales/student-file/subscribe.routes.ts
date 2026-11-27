import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { salesQuoteSchema, salesSubscriptionCreateSchema } from '../money';
import { packageCancelBodySchema } from '../package-cancel';
import {
  salesMoneySubscriptionViewSchema,
  salesQuoteViewSchema,
  salesTeacherOptionSchema,
} from './subscribe.schemas';

const ACCESS = { permissions: ['self.sales_money'], tags: ['sales'] } as const;

/**
 * A new package from a sales chat (R-ASST-01, docs/16 row 16), priced by the api from the
 * catalog, for her student or, with sales.renew_any, the child the chat `phone` names.
 */
export const salesSubscribeRoutes = {
  /** The active teachers she may pick for the package. */
  teachers: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/subscriptions/teachers',
    response: z.array(salesTeacherOptionSchema),
  }),
  quote: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/subscriptions/quote',
    body: salesQuoteSchema,
    response: salesQuoteViewSchema,
  }),
  /** A replay with the same clientRequestId answers the package already made. */
  create: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/subscriptions',
    body: salesSubscriptionCreateSchema,
    response: salesMoneySubscriptionViewSchema,
  }),
  /** Only an unused package of her own student; 409 has_payments or has_lessons. */
  cancel: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/subscriptions/:id/cancel',
    params: z.object({ id: id() }),
    body: packageCancelBodySchema,
    response: salesMoneySubscriptionViewSchema,
  }),
};
