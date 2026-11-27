import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  salesMeetingsQuerySchema,
  salesMeetingViewSchema,
  salesSubscriptionsQuerySchema,
  salesSubscriptionViewSchema,
} from './views';

const ACCESS = { permissions: ['self.sales'], tags: ['sales'] } as const;

/** The salesperson's own portal, no money; chats are /threads. */
export const salesPortalRoutes = {
  /** My pending (trial, unpaid, paused) or my confirmed (active) subscriptions. */
  subscriptions: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/subscriptions',
    query: salesSubscriptionsQuerySchema,
    response: z.array(salesSubscriptionViewSchema),
  }),
  /** The trial lessons of my leads in a range, with the classroom join window. */
  meetings: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/meetings',
    query: salesMeetingsQuerySchema,
    response: z.array(salesMeetingViewSchema),
  }),
};
