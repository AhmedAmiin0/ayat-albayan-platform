import { z } from 'zod';

/** GET /stripe/feature: 404 = the build has no Stripe at all. */
export const stripeFeatureSchema = z.object({ stripe: z.boolean() });
export type StripeFeature = z.infer<typeof stripeFeatureSchema>;

/** POST /webhooks/stripe: the event was taken in (a replay included). */
export const stripeWebhookAnswerSchema = z.object({ received: z.literal(true) });
export type StripeWebhookAnswer = z.infer<typeof stripeWebhookAnswerSchema>;
