import { type DynamicModule, Module } from '@nestjs/common';
import { SalesMoneyModule } from '@/modules/sales/sales-money';
import { PaymentsModule } from '@/modules/finance/payments';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { STRIPE_FACTORY, StripeClients, stripeFactory } from './gate/stripe-clients';
import { StripeFeatureController } from './gate/stripe-feature.controller';
import { StripeEnabledGuard } from './gate/stripe-gate';
import { stripeFeatureOn } from '@/config/env/env.stripe';
import { LinkCancel } from './links/link-cancel';
import { LinkCreate } from './links/link-create';
import { LinkCreateDeps, LinkDeps, LinkSalesDeps } from './links/link-deps';
import { LinkPackages } from './links/link-packages';
import { LinkViews } from './links/link-views';
import { PaymentLinksController } from './links/payment-links.controller';
import { PaymentLinksRepo } from './links/payment-links.repo';
import { CheckoutService } from './pay/checkout.service';
import { PayController } from './pay/pay.controller';
import { PayLimit } from './pay/pay-limit';
import { LinkAlerts } from './webhook/link-alerts';
import { LinkFulfilment } from './webhook/link-fulfilment';
import { LinkRefunds } from './webhook/link-refunds';
import { StripeEventsRepo } from './webhook/stripe-events.repo';
import { StripeWebhookController } from './webhook/stripe-webhook.controller';
import { StripeWebhookService, WebhookHandlers } from './webhook/stripe-webhook.service';
import { WebhookDeps } from './webhook/webhook-deps';

/**
 * Stripe payment links, with FEATURE_STRIPE (test or live) (owner 2026-10-28, go live 2026-11-01;
 * docs/30). register() reads FEATURE_STRIPE once, when AppModule is loaded: anything but 'test' or
 * 'live' gives an empty module (no controller, no provider, the webhook route not mounted: every
 * Stripe URL is 404). With it, GET /stripe/feature is mounted, and every other
 * route but the signed webhook is still 404 until an admin turns «الدفع الإلكتروني» on in
 * «التكاملات» (STRIPE_ENABLED, StripeEnabledGuard). The keys are integration keys too
 * (StripeClients). The money logic is the platform's own (SubscriptionCreator, PaymentsService,
 * the commission triggers).
 */
@Module({})
export class StripeTestModule {
  static register(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    if (!stripeFeatureOn(env)) return { module: StripeTestModule };
    return {
      module: StripeTestModule,
      imports: [SubscriptionsModule, PaymentsModule, SalesMoneyModule],
      controllers: [
        StripeFeatureController,
        PaymentLinksController,
        PayController,
        StripeWebhookController,
      ],
      providers: [
        { provide: STRIPE_FACTORY, useValue: stripeFactory },
        ...[StripeClients, StripeEnabledGuard, LinkViews, PaymentLinksRepo, LinkDeps],
        ...[LinkCreateDeps, LinkPackages, LinkCreate, LinkCancel, LinkSalesDeps],
        ...[CheckoutService, PayLimit, LinkAlerts, LinkFulfilment, LinkRefunds],
        ...[StripeEventsRepo, StripeWebhookService],
        ...[WebhookDeps, WebhookHandlers],
      ],
    };
  }
}
