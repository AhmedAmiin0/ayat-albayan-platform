import { describe, expect, it } from 'vitest';
import { StripeTestModule } from '../stripe.module';
import { stripeFeatureOn } from './stripe-gate';

describe('the env half of the Stripe gate', () => {
  it('only FEATURE_STRIPE=test turns it on', () => {
    expect(stripeFeatureOn({})).toBe(false);
    expect(stripeFeatureOn({ FEATURE_STRIPE: '1' })).toBe(false);
    expect(stripeFeatureOn({ FEATURE_STRIPE: 'live' })).toBe(false);
    expect(stripeFeatureOn({ FEATURE_STRIPE: 'test' })).toBe(true);
  });

  it('off: an empty module (no controller, no provider, no import); on: every route', () => {
    expect(StripeTestModule.register({})).toEqual({ module: StripeTestModule });
    const on = StripeTestModule.register({ FEATURE_STRIPE: 'test' });
    expect(on.controllers?.length).toBe(5);
  });
});
