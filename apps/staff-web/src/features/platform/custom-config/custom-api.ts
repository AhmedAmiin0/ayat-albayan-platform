import { customConfigCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

const calls = customConfigCalls({ apiFetch, apiSend });

/** The free-form entries (admin). */
export const customConfigQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.customConfig,
  queryFn: calls.list,
});

/** Create or replace one entry (audited). */
export const putCustom = calls.put;

/** Delete one entry (audited). */
export const deleteCustom = calls.remove;
