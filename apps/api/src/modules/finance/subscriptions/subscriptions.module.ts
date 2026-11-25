import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers';
import { SubscriptionAlertsModule } from '@/modules/finance/subscriptions/alerts';
import { SubscriptionsSharedModule } from '@/modules/finance/subscriptions/shared';
import { StartDateEditModule } from '@/modules/finance/subscriptions/start-date-edit';
import { StudentAccess } from './student-lifecycle/student-access';
import { StudentBalanceController, SubscriptionsController } from './subscriptions.controller';

/** R-SUB-01/02/03; routes S1-S8 (docs/11 §6). */
@Module({
  imports: [
    SubscriptionsSharedModule,
    SubscriptionAlertsModule,
    StartDateEditModule,
    TeachersModule,
  ],
  controllers: [SubscriptionsController, StudentBalanceController],
  providers: [StudentAccess],
  exports: [SubscriptionsSharedModule],
})
export class SubscriptionsModule {}
