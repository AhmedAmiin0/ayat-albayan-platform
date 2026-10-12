import type { IntegrationConfigItem, IntegrationPlainKey, IntegrationSecretKey } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

/** GET /settings/integrations (admin): every key, its source; a secret's value is always null. */
export const integrationsQuery = queryOptions({
  queryKey: ['settings', 'integrations'],
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
