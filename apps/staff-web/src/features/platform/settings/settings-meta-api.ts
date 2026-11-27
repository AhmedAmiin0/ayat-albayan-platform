import { settingsMetaCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

const calls = settingsMetaCalls({ apiFetch, apiSend });

/** Who last changed each stored setting, and when. */
export const settingsMetaQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.settingsMeta,
  queryFn: async () => (await calls.view()).meta,
});
