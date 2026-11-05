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
  StopRefundLedger,
  StopRefundRepo,
  StopRefunds,
} from './refund';

/**
 * «إلغاء الاشتراك» from the student's profile (owner 2026-10-30): stop the course, keep the money;
 * «إلغاء مع استرداد» (owner 2026-11-02) refunds what the attended lessons did not use.
 */
@Module({
  imports: [SubscriptionsModule, PaymentsModule, SalesModule],
  controllers: [CourseStopController],
  providers: [
    CourseStop,
    CourseStopRepo,
    // «إلغاء مع استرداد» (owner 2026-11-02): its own Stripe client (the keys of «التكاملات»).
    { provide: STRIPE_FACTORY, useValue: stripeFactory },
    ...[StripeClients, StopRefundCards, StopRefundLedger, StopRefundRepo, StopRefunds],
    ...[CourseStopSettings, StopRefundGate],
  ],
})
export class CourseStopModule {}
