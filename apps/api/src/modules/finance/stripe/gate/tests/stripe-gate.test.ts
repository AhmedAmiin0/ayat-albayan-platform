import { describe, expect, it } from 'vitest';
import { StripeGateModule } from '@/modules/finance/stripe/gate';
import { PaymentLinksModule } from '@/modules/finance/stripe/links';
import { StripePayModule } from '@/modules/finance/stripe/pay';
import { StripeTestModule } from '@/modules/finance/stripe/stripe.module';
import { StripeWebhookModule } from '@/modules/finance/stripe/webhook';

const ROUTES = [StripeGateModule, PaymentLinksModule, StripePayModule, StripeWebhookModule];

describe('the env half of the Stripe gate (stripeFeatureOn: env.stripe.test.ts)', () => {
  it('off (unset or anything but test / live): an empty module (no controller, no provider, no import)', () => {
    for (const env of [{}, { FEATURE_STRIPE: '1' }, { FEATURE_STRIPE: 'Live' }]) {
      expect(StripeTestModule.register(env)).toEqual({ module: StripeTestModule });
    }
  });

  it.each(['test', 'live'])('FEATURE_STRIPE=%s: every route', (mode) => {
    expect(StripeTestModule.register({ FEATURE_STRIPE: mode }).imports).toEqual(ROUTES);
  });
});
