import { z } from 'zod';
import type { PushKind } from '../enums/index.js';

// The bell (R-NOT-01): GET /me/notifications and POST /me/notifications/read. The rows are
// public.push_notifications addressed to the caller; `data` is what the push carried ({ phone },
// { studentId, lessonId }, { meetingId }), untrusted: webNotificationPath checks every field.

export interface NotificationItem {
  id: string;
  kind: PushKind;
  title: string;
  body: string;
  data: Record<string, string>;
  created_at: string;
  read_at: string | null;
}

export interface NotificationsPage {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  /** The caller's unread rows (the badge), whatever the page. */
  unread: number;
}

export const NOTIFICATIONS_PAGE_MAX = 50;

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(NOTIFICATIONS_PAGE_MAX).default(20),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

/** No ids = every unread row of the caller («تحديد الكل كمقروء»). */
export const notificationsReadSchema = z.strictObject({
  ids: z.array(z.uuid()).min(1).max(100).optional(),
});
export type NotificationsRead = z.infer<typeof notificationsReadSchema>;

/** GET /me/web-push/key: null = browser push is off (a WEB_PUSH_* key is unset). */
export interface WebPushKey {
  publicKey: string | null;
}
