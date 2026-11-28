import type { NotificationsOverview } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { call } from '@ab/web-kit';
import { catalogueKeys } from '@/features/messaging/keys';

/**
 * GET /admin/notifications (settings.read): the catalogue with each row's state from today's
 * settings. `version` changes whenever the settings or a line check change, so the list refetches.
 */
export const catalogueQuery = (version: number) =>
  queryOptions({
    queryKey: catalogueKeys.version(version),
    queryFn: () => call<NotificationsOverview>({ path: '/admin/notifications' }),
    placeholderData: (previous) => previous,
  });
