import { defineRoute } from '@ab/core';
import { stripeFeatureSchema } from './stripe.schemas';

/** Online payment (docs/30), written once for the api and its clients. */
export const stripeRoutes = {
  feature: defineRoute({ method: 'GET', path: '/stripe/feature', response: stripeFeatureSchema }),
};
