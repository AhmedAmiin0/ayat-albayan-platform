import { type DynamicModule, Module } from '@nestjs/common';
import { stripeFeatureOn } from '@/config/env/env.stripe';
import { StripeGateModule } from '@/modules/finance/stripe/gate';
import { PaymentLinksModule } from '@/modules/finance/stripe/links';
import { StripePayModule } from '@/modules/finance/stripe/pay';
import { StripeWebhookModule } from '@/modules/finance/stripe/webhook';

/** Without FEATURE_STRIPE test or live the module is empty: every Stripe URL is 404 (docs/30). */
@Module({})
export class StripeTestModule {
  static register(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    if (!stripeFeatureOn(env)) return { module: StripeTestModule };
    return {
      module: StripeTestModule,
      imports: [StripeGateModule, PaymentLinksModule, StripePayModule, StripeWebhookModule],
    };
  }
}
