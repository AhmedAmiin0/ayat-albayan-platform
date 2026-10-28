import type { StripeFeature } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/core/lib/http/api';
import { STRIPE_FEATURE } from './flag';

/** GET /stripe/feature: a 404 = the server has no Stripe at all (off, not an error). */
async function serverStripe(): Promise<boolean> {
  try {
    return (await apiFetch<StripeFeature>('/stripe/feature')).stripe === true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

/**
 * The test build's flag AND the server's switch (the admin's «تفعيل روابط الدفع»). With the build flag
 * off nothing is asked: the query never runs.
 */
export function useStripeOn(): boolean {
  const server = useQuery({
    queryKey: ['stripe', 'feature'],
    queryFn: serverStripe,
    enabled: STRIPE_FEATURE,
    staleTime: 5 * 60_000,
  });
  return STRIPE_FEATURE && server.data === true;
}
