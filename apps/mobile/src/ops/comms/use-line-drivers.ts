import type { IntegrationConfigItem, WaLine, WaProvider } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { driverValues } from './line-driver';

const PATH = '/settings/integrations';

/** GET /settings/integrations (settings.read): key names, set flags, plain values (never a secret's). */
export function useIntegrations() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<IntegrationConfigItem[]>(PATH), retry: false });
}

/** PUT one line's driver; the answer (every item) replaces the cached list. */
export function useSaveDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ line, provider }: { line: WaLine; provider: WaProvider }) => apiSend<IntegrationConfigItem[]>('PUT', PATH, driverValues(line, provider)),
    onSuccess: (items) => qc.setQueryData(pathKey(PATH), items),
  });
}
