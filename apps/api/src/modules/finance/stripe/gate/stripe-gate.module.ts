import { Module } from '@nestjs/common';
import { STRIPE_FACTORY, StripeClients, stripeFactory } from './stripe-clients';
import { StripeFeatureController } from './stripe-feature.controller';
import { StripeEnabledGuard } from './stripe-gate';

/** The Stripe clients and the feature gate that every Stripe route sits behind (docs/30). */
@Module({
  controllers: [StripeFeatureController],
  providers: [
    { provide: STRIPE_FACTORY, useValue: stripeFactory },
    ...[StripeClients, StripeEnabledGuard],
  ],
  exports: [StripeClients, StripeEnabledGuard],
})
export class StripeGateModule {}
