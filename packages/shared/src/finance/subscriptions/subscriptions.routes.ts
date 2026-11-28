import { defineRoute, id } from '@ab/core';
import {
  quoteResponseSchema,
  studentBalanceAnswerSchema,
  subscriptionCancelSchema,
  subscriptionCreateSchema,
  subscriptionPageSchema,
  subscriptionUpdateSchema,
  subscriptionViewSchema,
} from '@ab/money';
import { z } from 'zod';
import { emptyWhenMissing } from '../empty-when-missing';
import { subscriptionListQuerySchema, subscriptionQuoteSchema } from './subscriptions.schemas';

const byId = z.object({ id: id() });
const read = { permissions: ['subscriptions.read'], tags: ['subscriptions'] } as const;
const write = { permissions: ['subscriptions.write'], tags: ['subscriptions'] } as const;

/** Packages (S1–S5, R-SUB-01), written once for the api and its clients. */
export const subscriptionRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/subscriptions',
    query: subscriptionListQuerySchema,
    response: subscriptionPageSchema,
    ...read,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/subscriptions',
    body: subscriptionCreateSchema,
    response: subscriptionViewSchema,
    ...write,
  }),
  quote: defineRoute({
    method: 'POST',
    path: '/subscriptions/quote',
    body: subscriptionQuoteSchema,
    response: quoteResponseSchema,
    ...read,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/subscriptions/:id',
    params: byId,
    response: subscriptionViewSchema,
    ...read,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/subscriptions/:id',
    params: byId,
    body: subscriptionUpdateSchema,
    response: subscriptionViewSchema,
    ...write,
  }),
  cancel: defineRoute({
    method: 'POST',
    path: '/subscriptions/:id/cancel',
    params: byId,
    body: emptyWhenMissing(subscriptionCancelSchema),
    response: subscriptionViewSchema,
    ...write,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/subscriptions/:id',
    params: byId,
    response: 'empty',
    ...write,
  }),
};

/** GET /students/:id/balance (S6, R-SUB-01/03): the full view or, for a teacher, lessons only. */
export const studentBalanceRoutes = {
  get: defineRoute({
    method: 'GET',
    path: '/students/:id/balance',
    params: byId,
    response: studentBalanceAnswerSchema,
    permissions: ['students.balance'],
    tags: ['students'],
  }),
};
