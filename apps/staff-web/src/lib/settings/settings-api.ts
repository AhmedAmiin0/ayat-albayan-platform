import { settingsCalls } from '@ab/client-core';
import type { SettingsUpdate } from '@ab/settings';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { CONFIG_QUERY_KEYS } from './query-keys';

const calls = settingsCalls({ apiFetch, apiSend });

/** GET /settings (admin): every academy setting with its default filled in. */
export const settingsQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.settings,
  queryFn: () => calls.view(),
});

/** PATCH /settings (audited): only the keys sent change. */
export const updateSettings = (body: SettingsUpdate) => calls.update(body);
