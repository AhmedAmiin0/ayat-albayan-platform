import { Module } from '@nestjs/common';
import { PaymentsModule } from '@/modules/finance/payments';
import { STRIPE_FACTORY, StripeClients, stripeFactory } from '@/modules/finance/stripe';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { SalesModule } from '@/modules/sales/sales';
import { CourseStopController } from './course-stop.controller';
import { CourseStopRepo } from './course-stop.repo';
import { CourseStop } from './course-stop.service';
import {
  CourseStopSettings,
  StopRefundCards,
  StopRefundGate,
  StopOwedCalc,
  StopRefundLedger,
  StopRefundRepo,
  StopRefunds,
} from './refund';

/** Stopping keeps the money; cancel with refund returns what attended lessons left unused. */
@Module({
  imports: [SubscriptionsModule, PaymentsModule, SalesModule],
  controllers: [CourseStopController],
  providers: [
    CourseStop,
    CourseStopRepo,
    // Refund on cancel uses its own Stripe client with the integration keys.
    { provide: STRIPE_FACTORY, useValue: stripeFactory },
    ...[StripeClients, StopRefundCards, StopRefundLedger, StopRefundRepo, StopRefunds],
    ...[CourseStopSettings, StopRefundGate, StopOwedCalc],
  ],
})
export class CourseStopModule {}
