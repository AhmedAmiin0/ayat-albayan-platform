import type { NotificationsOverview } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/** Every version of the catalogue query (invalidate this to refetch it, e.g. after a template sync). */
export const CATALOGUE_QUERY_KEY = ['admin-notifications'] as const;

/**
 * GET /admin/notifications (settings.read): the catalogue with each row's state from today's
 * settings. `version` changes whenever the settings or a line check change, so the list refetches.
 */
export const catalogueQuery = (version: number) =>
  queryOptions({
    queryKey: [...CATALOGUE_QUERY_KEY, version],
    queryFn: () => apiFetch<NotificationsOverview>('/admin/notifications'),
    placeholderData: (previous) => previous,
  });
