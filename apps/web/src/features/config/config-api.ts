import type { SettingMeta } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/** GET /config/meta (admin): who last changed each stored setting, and when. */
export const configMetaQuery = queryOptions({
  queryKey: ['config', 'meta'],
  queryFn: async () => (await apiFetch<{ meta: Record<string, SettingMeta> }>('/config/meta')).meta,
});
