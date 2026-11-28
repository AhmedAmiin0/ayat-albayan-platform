import { notificationRuleCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { catalogueKeys } from '@/features/messaging/keys';

const rules = notificationRuleCalls({ apiFetch, apiSend });

/**
 * GET /admin/notifications (settings.read): the catalogue with each row's state from today's
 * settings. `version` changes whenever the settings or a line check change, so the list refetches.
 */
export const catalogueQuery = (version: number) =>
  queryOptions({
    queryKey: catalogueKeys.version(version),
    queryFn: () => rules.overview(),
    placeholderData: (previous) => previous,
  });
