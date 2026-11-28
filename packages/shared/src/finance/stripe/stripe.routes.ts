import { defineRoute } from '@ab/core';
import { stripeFeatureSchema, stripeWebhookAnswerSchema } from './stripe.schemas';

const access = { tags: ['stripe'], isPublic: true } as const;

/** Online payment (docs/30), written once for the api and its clients. */
export const stripeRoutes = {
  feature: defineRoute({
    method: 'GET',
    path: '/stripe/feature',
    response: stripeFeatureSchema,
    ...access,
  }),
  /** The raw body Stripe signed is read by the handler, so the route declares no body schema. */
  webhook: defineRoute({
    method: 'POST',
    path: '/webhooks/stripe',
    response: stripeWebhookAnswerSchema,
    ...access,
  }),
};
