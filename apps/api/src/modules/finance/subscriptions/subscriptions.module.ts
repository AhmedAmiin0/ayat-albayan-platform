import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { TeachersModule } from '../../people/teachers/teachers.module';
import { SubscriptionCancelQueries } from './cancel/subscription-cancel.queries';
import { SubscriptionCancel } from './cancel/subscription-cancel.service';
import { AdminTasksController } from './alerts/admin-tasks.controller';
import { AdminTasksQueries } from './alerts/admin-tasks.queries';
import { AlertsJob } from './alerts/alerts.job';
import { AlertsQueries } from './alerts/alerts.queries';
import { AlertsEnv, SubscriptionAlertsService } from './alerts/alerts.service';
import { BalanceQueries } from './money/balance.queries';
import { CommissionBell } from './money/commission-bell';
import { FollowUpEnv, MoneyFollowUps } from './money/money-follow-ups';
import { MoneyWrites } from './money/money-writes';
import { PackagesService } from './money/packages.service';
import { StudentAccess } from './student-lifecycle/student-access';
import { StudentBalanceController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsQueries } from './subscriptions.queries';
import { LeadConversion } from './student-lifecycle/lead-conversion';
import { SubscriptionCreator } from './subscription-creator';
import { StudentActivation } from './student-lifecycle/student-activation';
import { StudentDeactivation } from './student-lifecycle/student-deactivation';
import { StudentRenewal } from './student-lifecycle/student-renewal';
import { StudentStatusQueries } from './student-lifecycle/student-status.queries';
import { StudentExpiryJob } from './student-lifecycle/student-expiry.job';
import { StudentExpiryQueries } from './student-lifecycle/student-expiry.queries';
import { StudentTrialStatus } from './trial/student-trial-status';
import { StudentTrialQueries } from './trial/student-trial.queries';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsSettings } from './subscriptions.settings';
import { UnpaidFlags } from './alerts/unpaid-flags.service';

/**
 * Subscriptions priced from the catalog, balances (v_subscription_balance), the alerts job.
 * R-SUB-01/02/03. Routes S1–S8 (docs/11 §6).
 * Exports: MoneyWrites (payments: audit + recompute after a write), SubscriptionAlertsService
 * (reports/lessons may call evaluateLessons; AlertsJob already listens to LessonEvents),
 * PackagesService, BalanceQueries, UnpaidFlags (the lesson views' «الباقة مش مدفوعة» flag) and
 * SubscriptionCreator + SubscriptionsService + SubscriptionCancel (the salesperson's subscribe / cancel from the chat reuse them, sales-money),
 * StudentTrialStatus (a trial booking moves new → trial, owner 2026-10-15), CommissionBell (assistant-pay rings it after
 * an attribution or new terms earn a commission). StudentExpiryJob: pending_renewal → expired.
 */
@Module({
  imports: [PricingModule, TeachersModule],
  controllers: [SubscriptionsController, StudentBalanceController, AdminTasksController],
  providers: [
    AdminTasksQueries,
    AlertsJob,
    AlertsQueries,
    BalanceQueries,
    CommissionBell,
    FollowUpEnv,
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
    SubscriptionCancel,
    SubscriptionCancelQueries,
    AlertsEnv,
    SubscriptionsQueries,
    SubscriptionCreator,
    SubscriptionsService,
    SubscriptionsSettings,
    UnpaidFlags,
  ],
  exports: [
    BalanceQueries,
    CommissionBell,
    MoneyWrites,
    PackagesService,
    StudentTrialStatus,
    SubscriptionAlertsService,
    SubscriptionCancel,
    SubscriptionCreator,
    SubscriptionsQueries,
    SubscriptionsService,
    UnpaidFlags,
  ],
})
export class SubscriptionsModule {}
