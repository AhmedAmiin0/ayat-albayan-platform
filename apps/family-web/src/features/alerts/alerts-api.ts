import type { NotificationsPage } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { notificationsQuery, useMarkRead } from '@ab/web-kit/push';

// «الإشعارات» of the family pages (R-NOT-01): the same GET /me/notifications and «mark read» as
// the staff bell (the kit's notifications API); guardian / student hold notifications.push.

export type FamilyAlerts = NotificationsPage;

/** The newest page and the unread count, polled so the bell's badge moves. */
export const useAlerts = () => useQuery(notificationsQuery);

/** Marks rows read (no ids: every unread one), then re-reads the list and the badge. */
export const useMarkAlertsRead = useMarkRead;
