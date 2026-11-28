import { Module } from '@nestjs/common';
import { PaymentsModule } from '@/modules/finance/payments';
import { StripeGateModule } from '@/modules/finance/stripe/gate';
import { PaymentLinksModule } from '@/modules/finance/stripe/links';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { LinkAlerts } from './link-alerts';
import { LinkFulfilment } from './link-fulfilment';
import { LinkRefunds } from './link-refunds';
import { StripeEventsRepo } from './stripe-events.repo';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { WebhookHandlers } from './webhook-handlers';
import { WebhookDeps } from './webhook-deps';

/** Stripe events: a paid link becomes a payment, a refund is recorded, staff are told. */
@Module({
  imports: [StripeGateModule, PaymentLinksModule, PaymentsModule, SubscriptionsModule],
  controllers: [StripeWebhookController],
  providers: [
    ...[LinkAlerts, LinkFulfilment, LinkRefunds, StripeEventsRepo],
    ...[StripeWebhookService, WebhookDeps, WebhookHandlers],
  ],
})
export class StripeWebhookModule {}
