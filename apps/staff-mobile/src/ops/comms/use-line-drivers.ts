import type { IntegrationConfigItem } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { STRIPE_FEATURE_KEY } from '@/core/lib/stripe-flag';

const PATH = '/settings/integrations';

/**
 * GET /settings/integrations (settings.read): key names, set flags, plain values (never a
 * secret's). `enabled` false asks nothing (the Stripe row outside a Stripe build).
 */
export function useIntegrations(enabled = true) {
  return useQuery({
    queryKey: pathKey(PATH),
    queryFn: () => apiFetch<IntegrationConfigItem[]>(PATH),
    retry: false,
    enabled,
  });
}

/** The API checks and audits key names only; the response replaces the cached list. */
export function useSaveIntegrationValues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { values: Record<string, string> }) =>
      apiSend<IntegrationConfigItem[]>('PUT', PATH, body),
    onSuccess: (items) => {
      qc.setQueryData(pathKey(PATH), items);
      // Invalidated now so payment buttons update without waiting for use-stripe's 5 min.
      void qc.invalidateQueries({ queryKey: STRIPE_FEATURE_KEY });
    },
  });
}
