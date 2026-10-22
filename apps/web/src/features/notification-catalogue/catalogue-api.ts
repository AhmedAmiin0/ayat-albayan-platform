import type { NotificationsOverview } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * GET /admin/notifications (settings.read): the catalogue with each row's state from today's
 * settings. `version` changes whenever the settings or a line check change, so the list refetches.
 */
export const catalogueQuery = (version: number) =>
  queryOptions({
    queryKey: ['admin-notifications', version],
    queryFn: () => apiFetch<NotificationsOverview>('/admin/notifications'),
    placeholderData: (previous) => previous,
  });
