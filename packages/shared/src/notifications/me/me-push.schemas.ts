import { anyPushKindSchema } from '@ab/catalog';
import { id, instant, pageOf } from '@ab/core';
import { z } from 'zod';

/** A bell row; `data` keeps only the string fields the push carried, untrusted (webNotificationPath). */
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
