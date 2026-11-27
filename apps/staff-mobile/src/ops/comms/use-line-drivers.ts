import { integrationRoutes, type IntegrationValuesInput } from '@ab/catalog';
import { integrationCalls } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { STRIPE_FEATURE_KEY } from '@/core/lib/stripe-flag';

const calls = integrationCalls({ apiFetch, apiSend });
const LIST_KEY = pathKey(integrationRoutes.list.path);

/**
 * Key names, set flags, plain values (never a secret's). `enabled` false asks nothing (the
 * Stripe row outside a Stripe build).
 */
export function useIntegrations(enabled = true) {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: calls.list,
    retry: false,
    enabled,
  });
}

/** The API checks and audits key names only; the response replaces the cached list. */
export function useSaveIntegrationValues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IntegrationValuesInput) => calls.saveValues(body),
    onSuccess: (items) => {
      qc.setQueryData(LIST_KEY, items);
      // Invalidated now so payment buttons update without waiting for use-stripe's 5 min.
      void qc.invalidateQueries({ queryKey: STRIPE_FEATURE_KEY });
    },
  });
}
