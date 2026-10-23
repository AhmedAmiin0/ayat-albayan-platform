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
import { StudentDeactivation } from './student-deactivation';
import { StudentRenewal } from './student-renewal';
import { StudentStatusQueries } from './student-status.queries';
import { StudentExpiryJob } from './student-expiry.job';
import { StudentExpiryQueries } from './student-expiry.queries';
import { StudentTrialStatus } from './student-trial-status';
import { StudentTrialQueries } from './student-trial.queries';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsSettings } from './subscriptions.settings';
import { UnpaidFlags } from './unpaid-flags.service';

/**
 * Subscriptions priced from the catalog, balances (v_subscription_balance), the alerts job.
 * R-SUB-01/02/03. Routes S1–S8 (docs/11 §6).
 * Exports: MoneyWrites (payments: audit + recompute after a write), SubscriptionAlertsService
 * (reports/lessons may call evaluateLessons; AlertsJob already listens to LessonEvents),
 * PackagesService, BalanceQueries, UnpaidFlags (the lesson views' «الباقة مش مدفوعة» flag) and
 * SubscriptionCreator + SubscriptionsService (the salesperson's subscribe from the chat reuses them, sales-money),
 * StudentTrialStatus (a trial booking moves new → trial, owner 2026-10-15). StudentExpiryJob: pending_renewal → expired.
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
    StudentDeactivation,
    StudentRenewal,
    StudentStatusQueries,
    StudentExpiryJob,
    StudentExpiryQueries,
    StudentTrialQueries,
    StudentTrialStatus,
    SubscriptionAlertsService,
    AlertsEnv,
    SubscriptionsQueries,
    SubscriptionCreator,
    SubscriptionsService,
    SubscriptionsSettings,
    UnpaidFlags,
  ],
  exports: [
    BalanceQueries,
    MoneyWrites,
    PackagesService,
    StudentTrialStatus,
    SubscriptionAlertsService,
    SubscriptionCreator,
    SubscriptionsService,
    UnpaidFlags,
  ],
})
export class SubscriptionsModule {}
