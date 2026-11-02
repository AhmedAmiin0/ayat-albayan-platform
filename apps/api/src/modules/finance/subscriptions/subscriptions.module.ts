import { Module } from '@nestjs/common';
import { PricingModule } from '@/modules/finance/pricing/pricing.module';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { SubscriptionCancelRepo } from './cancel/subscription-cancel.repo';
import { SubscriptionCancel } from './cancel/subscription-cancel.service';
import { AdminTasksController } from './alerts/admin-tasks.controller';
import { AdminTasksRepo } from './alerts/admin-tasks.repo';
import { AlertsJob } from './alerts/alerts.job';
import { AlertsRepo } from './alerts/alerts.repo';
import { AlertsEnv, SubscriptionAlertsService } from './alerts/alerts.service';
import { BalanceRepo } from './money/balance.repo';
import { CommissionBell } from './money/commission-bell';
import { FollowUpEnv, MoneyFollowUps } from './money/money-follow-ups';
import { MoneyWrites } from './money/money-writes';
import { PackagesService } from './money/packages.service';
import { StudentAccess } from './student-lifecycle/student-access';
import { StudentBalanceController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsRepo } from './subscriptions.repo';
import { LeadConversion } from './student-lifecycle/lead-conversion';
import { SubscriptionCreator } from './subscription-creator';
import { StudentActivation } from './student-lifecycle/student-activation';
import { StudentDeactivation } from './student-lifecycle/student-deactivation';
import { StudentRenewal } from './student-lifecycle/student-renewal';
import { StudentStatusRepo } from './student-lifecycle/student-status.repo';
import { StudentExpiryJob } from './student-lifecycle/student-expiry.job';
import { StudentExpiryRepo } from './student-lifecycle/student-expiry.repo';
import { StudentTrialStatus } from './trial/student-trial-status';
import { StudentTrialRepo } from './trial/student-trial.repo';
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
    AdminTasksRepo,
    AlertsJob,
    AlertsRepo,
    BalanceRepo,
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
    StudentStatusRepo,
    StudentExpiryJob,
    StudentExpiryRepo,
    StudentTrialRepo,
    StudentTrialStatus,
    SubscriptionAlertsService,
    SubscriptionCancel,
    SubscriptionCancelRepo,
    AlertsEnv,
    SubscriptionsRepo,
    SubscriptionCreator,
    SubscriptionsService,
    SubscriptionsSettings,
    UnpaidFlags,
  ],
  exports: [
    BalanceRepo,
    CommissionBell,
    MoneyWrites,
    PackagesService,
    StudentTrialStatus,
    SubscriptionAlertsService,
    SubscriptionCancel,
    SubscriptionCreator,
    SubscriptionsRepo,
    SubscriptionsService,
    UnpaidFlags,
  ],
})
export class SubscriptionsModule {}
