import { describe, expect, it } from 'vitest';
import { StripeTestModule } from '@/modules/finance/stripe/stripe.module';

describe('the env half of the Stripe gate (stripeFeatureOn: env.stripe.test.ts)', () => {
  it('off: an empty module (no controller, no provider, no import); on: every route', () => {
    expect(StripeTestModule.register({})).toEqual({ module: StripeTestModule });
    const on = StripeTestModule.register({ FEATURE_STRIPE: 'test' });
    expect(on.controllers?.length).toBe(4);
  });
});
