import { z } from 'zod';
import { pageQuery } from '@ab/core';
import type { AnyPushKind } from '@ab/catalog';
import type { NotificationsPage } from './me/me-push.schemas';

// The bell (R-NOT-01): GET /me/notifications and POST /me/notifications/read. The rows are
// public.push_notifications addressed to the caller; `data` is what the push carried ({ phone },
// { studentId, lessonId }, { meetingId }), untrusted: webNotificationPath checks every field.

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
  ...pageQuery({ size: 20, max: NOTIFICATIONS_PAGE_MAX }),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

/** No ids means every unread row of the caller. */
export const notificationsReadSchema = z.strictObject({
  ids: z.array(z.uuid()).min(1).max(100).optional(),
});
export type NotificationsRead = z.infer<typeof notificationsReadSchema>;
