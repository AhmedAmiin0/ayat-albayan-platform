import { stripeRoutes, type StripeFeature } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

/** GET /stripe/feature on one api client; the answer is parsed strictly. */
export function stripeFeatureCall(client: ApiClient): () => Promise<StripeFeature> {
  const call = callWith(client);
  return () => call({ route: stripeRoutes.feature });
}
