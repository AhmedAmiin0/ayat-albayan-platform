import { z } from 'zod';
import { pageQuery } from '@ab/core';
import type { AnyPushKind } from '@ab/catalog';

// The bell (R-NOT-01): GET /me/notifications and POST /me/notifications/read. The rows are
// public.push_notifications addressed to the caller; `data` is what the push carried ({ phone },
// { studentId, lessonId }, { meetingId }), untrusted: webNotificationPath checks every field.

export interface NotificationItem {
  id: string;
  kind: AnyPushKind;
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

/**
 * The id of the newest bell row of `kind` on a page (rows come newest first), or null: the wallet refreshes
 * when it changes. A body that is not a page (an older API, a stub) reads as none.
 */
export function newestOfKind(
  page: NotificationsPage | undefined,
  kind: AnyPushKind,
): string | null {
  const items = page?.items;
  return Array.isArray(items) ? (items.find((n) => n.kind === kind)?.id ?? null) : null;
}

export const notificationsQuerySchema = z.object({
  ...pageQuery({ size: 20, max: NOTIFICATIONS_PAGE_MAX, lastPage: 10_000 }),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

/** No ids means every unread row of the caller. */
export const notificationsReadSchema = z.strictObject({
  ids: z.array(z.uuid()).min(1).max(100).optional(),
});
export type NotificationsRead = z.infer<typeof notificationsReadSchema>;

/** GET /me/web-push/key: null = browser push is off (a WEB_PUSH_* key is unset). */
export interface WebPushKey {
  publicKey: string | null;
}
