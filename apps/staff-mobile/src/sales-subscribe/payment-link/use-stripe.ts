import { stripeFeatureCall } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@ab/mobile-kit';
import { STRIPE_FEATURE_KEY } from '@/core/lib/stripe-flag';
import { STRIPE_FEATURE } from './flag';

/**
 * GET /stripe/feature: `{ stripe: true }` only while STRIPE_ENABLED is on AND both Stripe keys are
 * saved; a 404 = the server has no Stripe at all (off, not an error).
 */
const stripeFeature = stripeFeatureCall({ apiFetch, apiSend });

async function serverStripe(): Promise<boolean> {
  try {
    return (await stripeFeature()).stripe;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

/** Needs the Stripe build flag and the server's STRIPE_ENABLED; flag off, the query never runs. */
export function useStripeOn(): boolean {
  const server = useQuery({
    queryKey: STRIPE_FEATURE_KEY,
    queryFn: serverStripe,
    enabled: STRIPE_FEATURE,
    staleTime: 5 * 60_000,
  });
  return STRIPE_FEATURE && server.data === true;
}
