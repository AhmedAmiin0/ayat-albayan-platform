import { backupCalls, crmWebhookCalls, integrationCalls } from '@ab/client-core';
import type { IntegrationValuesInput } from '@ab/catalog';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

const calls = integrationCalls({ apiFetch, apiSend });

/** Every key and its source (admin); a secret's value is always null. */
export const integrationsQuery = queryOptions({
  queryKey: CONFIG_QUERY_KEYS.integrations,
  queryFn: calls.list,
});

/** Plain keys; null clears (the server's env value applies again). */
export const putIntegrationValues = (values: IntegrationValuesInput['values']) =>
  calls.saveValues({ values });

/** Write-only (stored in Vault). */
export const putIntegrationSecret = calls.saveSecret;

export const clearIntegrationSecret = calls.clearSecret;

/** The CRM's delivery-ticks webhook (never its secret). */
export const registerCrmWebhook = crmWebhookCalls({ apiFetch, apiSend }).register;

/** Put, read and delete a probe object (docs/45). */
export const probeStorage = calls.probeStorage;

/** The Drive backup's status line (docs/45 §5). */
export const fetchStorageBackup = backupCalls({ apiFetch, apiSend }).status;
