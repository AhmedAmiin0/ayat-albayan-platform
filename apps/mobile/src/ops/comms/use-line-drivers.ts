import type { IntegrationConfigItem } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

const PATH = '/settings/integrations';

/**
 * GET /settings/integrations (settings.read): key names, set flags, plain values (never a
 * secret's). `enabled` false asks nothing (the Stripe row outside the test app).
 */
export function useIntegrations(enabled = true) {
  return useQuery({
    queryKey: pathKey(PATH),
    queryFn: () => apiFetch<IntegrationConfigItem[]>(PATH),
    retry: false,
    enabled,
  });
}

/**
 * PUT plain values, the web «التكاملات» save (a line's driver, «الدفع الإلكتروني»): the API checks
 * and audits them (key names only); the answer (every item) replaces the cached list.
 */
export function useSaveIntegrationValues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { values: Record<string, string> }) =>
      apiSend<IntegrationConfigItem[]>('PUT', PATH, body),
    onSuccess: (items) => qc.setQueryData(pathKey(PATH), items),
  });
}
