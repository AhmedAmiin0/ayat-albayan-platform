import type { NotificationsPage } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { notificationsQuery, useMarkRead } from '@ab/web-kit/push/notifications-api';

// R-NOT-01: same endpoint and mark-read as the staff bell; families hold notifications.push.

export type FamilyAlerts = NotificationsPage;

/** The newest page and the unread count, polled so the bell's badge moves. */
export const useAlerts = () => useQuery(notificationsQuery);

/** Marks rows read (no ids: every unread one), then re-reads the list and the badge. */
export const useMarkAlertsRead = useMarkRead;
