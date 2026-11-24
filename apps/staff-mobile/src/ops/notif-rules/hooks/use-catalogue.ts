import type { NotificationsOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@ab/mobile-kit';
import { useSettings } from '@/ops/settings/use-settings';
import { CATALOGUE_KEY } from './use-toggle-rule';

/** The key carries the settings' fetch time, so a saved field refetches the list. */
export function useCatalogue() {
  const version = useSettings().dataUpdatedAt;
  return useQuery({
    queryKey: [...CATALOGUE_KEY, version],
    queryFn: () => apiFetch<NotificationsOverview>('/admin/notifications'),
    placeholderData: (previous) => previous,
  });
}
