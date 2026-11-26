import { z } from 'zod';

/** GET /stripe/feature: 404 = the build has no Stripe at all. */
export const stripeFeatureSchema = z.object({ stripe: z.boolean() });
export type StripeFeature = z.infer<typeof stripeFeatureSchema>;
