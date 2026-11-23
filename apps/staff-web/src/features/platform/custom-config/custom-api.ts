import type { CustomConfigUpsert, CustomConfigView } from '@ab/settings';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

/** GET /config/custom (admin): the free-form entries. */
export const customConfigQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.customConfig,
  queryFn: () => apiFetch<CustomConfigView[]>('/config/custom'),
});

/** PUT /config/custom/:key (audited): create or replace. */
export const putCustom = (input: { key: string; body: CustomConfigUpsert }) =>
  apiSend<CustomConfigView>('PUT', `/config/custom/${encodeURIComponent(input.key)}`, input.body);

/** DELETE /config/custom/:key (audited). */
export const deleteCustom = (key: string) => apiSend('DELETE', `/config/custom/${encodeURIComponent(key)}`);
