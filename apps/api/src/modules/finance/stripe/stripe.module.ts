import { type DynamicModule, Module } from '@nestjs/common';
import { SalesMoneyModule } from '../../sales/sales-money';
import { PaymentsModule } from '../payments';
import { SubscriptionsModule } from '../subscriptions';
import { StripeAdminController } from './admin/stripe-admin.controller';
import { StripeAdmin } from './admin/stripe-admin.service';
import { STRIPE_FACTORY, StripeClients, stripeFactory } from './gate/stripe-clients';
import { StripeFeatureController } from './gate/stripe-feature.controller';
import { stripeFeatureOn, StripeEnabledGuard } from './gate/stripe-gate';
import { StripeSettingsQueries } from './gate/stripe-settings.queries';
import { LinkCancel } from './links/link-cancel';
import { LinkCreate } from './links/link-create';
import { LinkCreateDeps, LinkDeps, LinkSalesDeps } from './links/link-deps';
import { LinkPackages } from './links/link-packages';
import { LinkViews } from './links/link-views';
import { PaymentLinksController } from './links/payment-links.controller';
import { PaymentLinksQueries } from './links/payment-links.queries';
import { CheckoutService } from './pay/checkout.service';
import { PayController } from './pay/pay.controller';
import { PayLimit } from './pay/pay-limit';
import { LinkAlerts } from './webhook/link-alerts';
import { LinkFulfilment } from './webhook/link-fulfilment';
import { LinkRefunds } from './webhook/link-refunds';
import { StripeEventsQueries } from './webhook/stripe-events.queries';
import { StripeWebhookController } from './webhook/stripe-webhook.controller';
import { StripeWebhookService, WebhookHandlers } from './webhook/stripe-webhook.service';
import { WebhookDeps } from './webhook/webhook-deps';

/**
 * Stripe payment links, TEST BUILD ONLY (owner 2026-10-28: «dont make stripe available for the normal production
 * build»; docs/30). register() reads FEATURE_STRIPE once, when AppModule is loaded: anything but 'test' gives
 * an empty module (no controller, no provider, the webhook route not mounted: every Stripe URL is 404). With
 * it, the admin settings and GET /stripe/feature are mounted, and every other route is still 404 until the
 * admin turns stripe_settings.stripe_enabled on (StripeEnabledGuard). The money logic is the platform's own
 * (SubscriptionCreator, PaymentsService, the commission triggers).
 */
@Module({})
export class StripeTestModule {
  static register(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    if (!stripeFeatureOn(env)) return { module: StripeTestModule };
    return {
      module: StripeTestModule,
      imports: [SubscriptionsModule, PaymentsModule, SalesMoneyModule],
      controllers: [StripeFeatureController, StripeAdminController, PaymentLinksController, PayController, StripeWebhookController],
      providers: [
        { provide: STRIPE_FACTORY, useValue: stripeFactory },
        ...[StripeSettingsQueries, StripeClients, StripeEnabledGuard, StripeAdmin, LinkViews, PaymentLinksQueries, LinkDeps, LinkCreateDeps, LinkPackages, LinkCreate, LinkCancel, LinkSalesDeps],
        ...[CheckoutService, PayLimit, LinkAlerts, LinkFulfilment, LinkRefunds, StripeEventsQueries, StripeWebhookService],
        ...[WebhookDeps, WebhookHandlers],
      ],
    };
  }
}
