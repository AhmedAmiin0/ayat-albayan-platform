import type { SettingsMetaResponse } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

/** GET /config/meta (admin): who last changed each stored setting, and when. */
export const settingsMetaQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.settingsMeta,
  queryFn: async () => (await apiFetch<SettingsMetaResponse>('/config/meta')).meta,
});
