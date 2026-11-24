import { useQuery } from '@tanstack/react-query';
import { stripeFeatureQuery } from './api';
import { stripeBuild } from './stripe-build';

/** Shown only when both the build and GET /stripe/feature agree; failed or 404 means off. */
export function useStripeFeature(): boolean {
  const build = stripeBuild();
  const feature = useQuery({ ...stripeFeatureQuery, enabled: build });
  return build && feature.data?.stripe === true;
}
