import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AdminTasksController } from './admin-tasks.controller';
import { AdminTasksQueries } from './admin-tasks.queries';
import { AlertsJob } from './alerts.job';
import { AlertsQueries } from './alerts.queries';
import { AlertsEnv, SubscriptionAlertsService } from './alerts.service';
import { BalanceQueries } from './balance.queries';
import { MoneyWrites } from './money-writes';
import { PackagesService } from './packages.service';
import { StudentAccess } from './student-access';
import { StudentBalanceController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsQueries } from './subscriptions.queries';
import { SubscriptionCreator, SubscriptionsService } from './subscriptions.service';
import { UnpaidFlags } from './unpaid-flags.service';

/**
 * Subscriptions priced from the catalog, balances (v_subscription_balance), the alerts job.
 * R-SUB-01/02/03. Routes S1–S8 (docs/11 §6).
 * Exports: MoneyWrites (payments: audit + recompute after a write), SubscriptionAlertsService
 * (reports/lessons may call evaluateLessons; AlertsJob already listens to LessonEvents),
 * PackagesService, BalanceQueries, and UnpaidFlags (the lesson views' «الباقة مش مدفوعة» flag).
 */
@Module({
  imports: [PricingModule, TeachersModule],
  controllers: [SubscriptionsController, StudentBalanceController, AdminTasksController],
  providers: [
    AdminTasksQueries,
    AlertsJob,
    AlertsQueries,
    BalanceQueries,
    MoneyWrites,
    PackagesService,
    StudentAccess,
    SubscriptionAlertsService,
    AlertsEnv,
    SubscriptionsQueries,
    SubscriptionCreator,
    SubscriptionsService,
    UnpaidFlags,
  ],
  exports: [BalanceQueries, MoneyWrites, PackagesService, SubscriptionAlertsService, UnpaidFlags],
})
export class SubscriptionsModule {}
