import type { StripeAdminSettings, StripeSettingsPatch } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHolds, useIsAdmin } from '@/auth';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { STRIPE_FEATURE } from '@/sales-subscribe';

// «الدفع الإلكتروني (اختبار)» in the Stripe test app (docs/30): the existing admin API, nothing new.

const KEY = ['admin', 'stripe', 'settings'] as const;

/**
 * The test build's flag first (in preview / production nothing below is ever asked), then the admin
 * (settings.read AND base-role admin). GET /admin/stripe/settings: 404 = the server has no Stripe.
 */
export function useStripeSettings() {
  const holds = useHolds('settings.read');
  const admin = useIsAdmin();
  const allowed = STRIPE_FEATURE && holds && admin;
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<StripeAdminSettings>('/admin/stripe/settings'),
    enabled: allowed,
    retry: false,
  });
  return { allowed, settings: allowed ? query.data : undefined, query };
}

/** PATCH /admin/stripe/settings (settings.write): its answer replaces the cached settings. */
export function useSaveStripeSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: StripeSettingsPatch) => apiSend<StripeAdminSettings>('PATCH', '/admin/stripe/settings', patch),
    onSuccess: (next) => client.setQueryData(KEY, next),
  });
}
