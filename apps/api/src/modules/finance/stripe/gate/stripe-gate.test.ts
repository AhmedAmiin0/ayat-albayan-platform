import { describe, expect, it } from 'vitest';
import { StripeTestModule } from '@/modules/finance/stripe/stripe.module';

describe('the env half of the Stripe gate (stripeFeatureOn: env.stripe.test.ts)', () => {
  it('off (unset or anything but test / live): an empty module (no controller, no provider, no import)', () => {
    for (const env of [{}, { FEATURE_STRIPE: '1' }, { FEATURE_STRIPE: 'Live' }]) {
      expect(StripeTestModule.register(env)).toEqual({ module: StripeTestModule });
    }
  });

  it.each(['test', 'live'])('FEATURE_STRIPE=%s: every route', (mode) => {
    expect(StripeTestModule.register({ FEATURE_STRIPE: mode }).controllers?.length).toBe(4);
  });
});
