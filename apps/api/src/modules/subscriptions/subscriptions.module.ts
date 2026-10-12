import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AdminTasksController } from './admin-tasks.controller';
import { AdminTasksQueries } from './admin-tasks.queries';
import { AlertsJob } from './alerts.job';
import { AlertsQueries } from './alerts.queries';
import { AlertsEnv, SubscriptionAlertsService } from './alerts.service';
import { BalanceQueries } from './balance.queries';
import { MoneyFollowUps } from './money-follow-ups';
import { MoneyWrites } from './money-writes';
import { PackagesService } from './packages.service';
import { StudentAccess } from './student-access';
import { StudentBalanceController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsQueries } from './subscriptions.queries';
import { LeadConversion } from './lead-conversion';
import { SubscriptionCreator } from './subscription-creator';
import { StudentActivation } from './student-activation';
import { SubscriptionsService } from './subscriptions.service';
import { UnpaidFlags } from './unpaid-flags.service';

/**
 * Subscriptions priced from the catalog, balances (v_subscription_balance), the alerts job.
 * R-SUB-01/02/03. Routes S1–S8 (docs/11 §6).
 * Exports: MoneyWrites (payments: audit + recompute after a write), SubscriptionAlertsService
 * (reports/lessons may call evaluateLessons; AlertsJob already listens to LessonEvents),
 * PackagesService, BalanceQueries, UnpaidFlags (the lesson views' «الباقة مش مدفوعة» flag) and
 * SubscriptionCreator + SubscriptionsService (the salesperson's subscribe from the chat reuses them, sales-money).
 */
@Module({
  imports: [PricingModule, TeachersModule],
  controllers: [SubscriptionsController, StudentBalanceController, AdminTasksController],
  providers: [
    AdminTasksQueries,
    AlertsJob,
    AlertsQueries,
    BalanceQueries,
    LeadConversion,
    MoneyFollowUps,
    MoneyWrites,
    PackagesService,
    StudentAccess,
    StudentActivation,
    SubscriptionAlertsService,
    AlertsEnv,
    SubscriptionsQueries,
    SubscriptionCreator,
    SubscriptionsService,
    UnpaidFlags,
  ],
  exports: [BalanceQueries, MoneyWrites, PackagesService, SubscriptionAlertsService, SubscriptionCreator, SubscriptionsService, UnpaidFlags],
})
export class SubscriptionsModule {}
