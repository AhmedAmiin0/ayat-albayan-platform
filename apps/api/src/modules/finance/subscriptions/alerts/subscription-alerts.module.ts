import { Module } from '@nestjs/common';
import { SubscriptionsSharedModule } from '@/modules/finance/subscriptions/shared';
import { AdminTasksController } from './admin-tasks.controller';
import { AdminTasksRepo } from './admin-tasks.repo';
import { AlertsJob } from './alerts.job';

@Module({
  imports: [SubscriptionsSharedModule],
  controllers: [AdminTasksController],
  providers: [AdminTasksRepo, AlertsJob],
})
export class SubscriptionAlertsModule {}
