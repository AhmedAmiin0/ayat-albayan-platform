import { Module } from '@nestjs/common';
import { STRIPE_FACTORY, StripeClients, stripeFactory } from './stripe-clients';
import { StripeFeatureController } from './stripe-feature.controller';
import { StripeEnabledGuard } from './stripe-gate';

/** Stripe clients and the STRIPE_ENABLED guard; the webhook stays outside the guard (docs/30). */
@Module({
  controllers: [StripeFeatureController],
  providers: [
    { provide: STRIPE_FACTORY, useValue: stripeFactory },
    ...[StripeClients, StripeEnabledGuard],
  ],
  exports: [StripeClients],
})
export class StripeGateModule {}
