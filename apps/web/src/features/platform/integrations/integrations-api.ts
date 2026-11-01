import type { IntegrationConfigItem, IntegrationPlainKey, IntegrationSecretKey } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

/** GET /settings/integrations (admin): every key, its source; a secret's value is always null. */
export const integrationsQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.integrations,
  queryFn: () => apiFetch<IntegrationConfigItem[]>('/settings/integrations'),
});

/** PUT /settings/integrations: plain keys; null clears (the server's env value applies again). */
export const putIntegrationValues = (values: Partial<Record<IntegrationPlainKey, string | null>>) =>
  apiSend<IntegrationConfigItem[]>('PUT', '/settings/integrations', { values });

/** PUT /settings/integrations/secrets/:key: write-only (stored in Vault). */
export const putIntegrationSecret = (input: { key: IntegrationSecretKey; value: string }) =>
  apiSend<IntegrationConfigItem[]>('PUT', `/settings/integrations/secrets/${input.key}`, { value: input.value });

export const clearIntegrationSecret = (key: IntegrationSecretKey) =>
  apiSend<IntegrationConfigItem[]>('DELETE', `/settings/integrations/secrets/${key}`);

/** POST /settings/integrations/crm-webhook: the CRM's delivery-ticks webhook (never its secret). */
export const registerCrmWebhook = (): Promise<unknown> =>
  apiFetch('/settings/integrations/crm-webhook', { method: 'POST' });
