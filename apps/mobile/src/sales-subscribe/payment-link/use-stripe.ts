import type { StripeFeature } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/core/lib/http/api';
import { STRIPE_FEATURE_KEY } from '@/core/lib/stripe-flag';
import { STRIPE_FEATURE } from './flag';

/**
 * GET /stripe/feature: `{ stripe: true }` only while STRIPE_ENABLED is on AND both Stripe keys are
 * saved; a 404 = the server has no Stripe at all (off, not an error).
 */
async function serverStripe(): Promise<boolean> {
  try {
    return (await apiFetch<StripeFeature>('/stripe/feature')).stripe === true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

/**
 * The Stripe build flag AND the server's switch («خدمة الدفع الإلكتروني» in «التكاملات»,
 * STRIPE_ENABLED). With the build flag off nothing is asked: the query never runs.
 */
export function useStripeOn(): boolean {
  const server = useQuery({
    queryKey: STRIPE_FEATURE_KEY,
    queryFn: serverStripe,
    enabled: STRIPE_FEATURE,
    staleTime: 5 * 60_000,
  });
  return STRIPE_FEATURE && server.data === true;
}
