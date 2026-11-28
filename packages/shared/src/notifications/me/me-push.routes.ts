import { defineRoute } from '@ab/core';
import { notificationsQuerySchema, notificationsReadSchema } from '../views';
import {
  notificationsPageSchema,
  webPushEndpointQuerySchema,
  webPushKeySchema,
  webPushSubscriptionSchema,
} from './me-push.schemas';

const ACCESS = { permissions: ['notifications.push'], tags: ['me'] } as const;

/** The bell (R-NOT-01): the caller's own rows only, never an id from the request. */
export const meNotificationRoutes = {
  list: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/me/notifications',
    query: notificationsQuerySchema,
    response: notificationsPageSchema,
  }),
  read: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/me/notifications/read',
    body: notificationsReadSchema.optional(),
    response: 'empty',
  }),
};

/** This browser's push subscription (R-NOT-02), for staff and families alike. */
export const webPushRoutes = {
  key: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/me/web-push/key',
    response: webPushKeySchema,
  }),
  /** Idempotent; bound to the caller's session. */
  subscribe: defineRoute({
    ...ACCESS,
    method: 'PUT',
    path: '/me/web-push',
    body: webPushSubscriptionSchema,
    response: 'empty',
  }),
  unsubscribe: defineRoute({
    ...ACCESS,
    method: 'DELETE',
    path: '/me/web-push',
    query: webPushEndpointQuerySchema,
    response: 'empty',
  }),
};
