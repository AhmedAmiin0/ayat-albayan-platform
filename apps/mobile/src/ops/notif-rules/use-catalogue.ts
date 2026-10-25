import type { NotificationsOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { useSettings } from '../use-settings';
import { CATALOGUE_KEY } from './use-toggle-rule';

/**
 * GET /admin/notifications, shared by «الإشعارات» and the overview's «ماذا يُرسل الآن». The key
 * carries the settings' fetch time, so a saved field refetches the list.
 */
export function useCatalogue() {
  const version = useSettings().dataUpdatedAt;
  return useQuery({
    queryKey: [...CATALOGUE_KEY, version],
    queryFn: () => apiFetch<NotificationsOverview>('/admin/notifications'),
    placeholderData: (previous) => previous,
  });
}
