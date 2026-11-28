import { anyPushKindSchema } from '@ab/catalog';
import { id, instant, pageOf } from '@ab/core';
import { z } from 'zod';
import { pushEndpointAllowed } from './web-push-endpoint';

/** A bell row; `data` holds only the push's string fields, untrusted (webNotificationPath). */
export const notificationItemSchema = z.object({
  id: id(),
  kind: anyPushKindSchema,
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.string()),
  created_at: instant,
  read_at: instant.nullable(),
});
export type NotificationItem = z.infer<typeof notificationItemSchema>;

/** `unread` is the caller's unread rows (the badge), whatever the page. */
export const notificationsPageSchema = pageOf(notificationItemSchema).extend({
  unread: z.number().int(),
});
export type NotificationsPage = z.infer<typeof notificationsPageSchema>;

/** null = browser push is off (a WEB_PUSH_* key is unset). */
export const webPushKeySchema = z.object({ publicKey: z.string().nullable() });
export type WebPushKey = z.infer<typeof webPushKeySchema>;

/** Any URL-ish string: removing a browser never reaches out to it. */
export const webPushEndpointQuerySchema = z.object({ endpoint: z.string().min(1).max(2048) });
export type WebPushEndpointQuery = z.infer<typeof webPushEndpointQuerySchema>;

const base64url = (length: number) =>
  z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${length}}$`), 'invalid_key');

/** PushSubscription.toJSON() (migration 380's column checks, plus the push service allow-list). */
export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(pushEndpointAllowed, 'endpoint_not_allowed'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: base64url(87), auth: base64url(22) }),
});
export type WebPushSubscriptionInput = z.infer<typeof webPushSubscriptionSchema>;
