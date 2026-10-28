import { useQuery } from '@tanstack/react-query';
import { stripeFeatureQuery } from './api';
import { stripeBuild } from './stripe-build';

/**
 * «رابط دفع» is shown only when both say so: the test build (stripeBuild) and the API (GET /stripe/feature
 * `stripe: true`). Off in a normal build, with no request at all; a failed or 404 answer is off too.
 */
export function useStripeFeature(): boolean {
  const build = stripeBuild();
  const feature = useQuery({ ...stripeFeatureQuery, enabled: build });
  return build && feature.data?.stripe === true;
}
