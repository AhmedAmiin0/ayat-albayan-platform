import { Module } from '@nestjs/common';
import { PricingModule } from '@/modules/finance/pricing';
import { AlertsRepo } from '@/modules/finance/subscriptions/alerts/alerts.repo';
import {
  AlertsEnv,
  SubscriptionAlertsService,
} from '@/modules/finance/subscriptions/alerts/alerts.service';
import { UnpaidFlags } from '@/modules/finance/subscriptions/alerts/unpaid-flags.service';
import { SubscriptionCancelRepo } from '@/modules/finance/subscriptions/cancel/subscription-cancel.repo';
import { SubscriptionCancel } from '@/modules/finance/subscriptions/cancel/subscription-cancel.service';
import { CourseDue } from '@/modules/finance/subscriptions/course-due/course-due';
import { CourseDueRepo } from '@/modules/finance/subscriptions/course-due/course-due.repo';
import { BalanceRepo } from '@/modules/finance/subscriptions/money/balance.repo';
import { CommissionBell } from '@/modules/finance/subscriptions/money/commission-bell';
import { FollowUpEnv, MoneyFollowUps } from '@/modules/finance/subscriptions/money/money-follow-ups';
import { MoneyWrites } from '@/modules/finance/subscriptions/money/money-writes';
import { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { LeadConversion } from '@/modules/finance/subscriptions/student-lifecycle/lead-conversion';
import { StudentActivation } from '@/modules/finance/subscriptions/student-lifecycle/student-activation';
import { StudentDeactivation } from '@/modules/finance/subscriptions/student-lifecycle/student-deactivation';
import { StudentExpiryJob } from '@/modules/finance/subscriptions/student-lifecycle/student-expiry.job';
import { StudentExpiryRepo } from '@/modules/finance/subscriptions/student-lifecycle/student-expiry.repo';
import { StudentRenewal } from '@/modules/finance/subscriptions/student-lifecycle/student-renewal';
import { StudentStatusRepo } from '@/modules/finance/subscriptions/student-lifecycle/student-status.repo';
import { StudentTrialStatus } from '@/modules/finance/subscriptions/trial/student-trial-status';
import { StudentTrialRepo } from '@/modules/finance/subscriptions/trial/student-trial.repo';
import { UsedBeforeEditRepo } from '@/modules/finance/subscriptions/used-before-edit/used-before-edit.repo';
import { UsedBeforeEdit } from '@/modules/finance/subscriptions/used-before-edit/used-before-edit.service';
import { SubscriptionCreator } from './subscription-creator';
import { SubscriptionsRepo } from './subscriptions.repo';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsSettings } from './subscriptions.settings';

/**
 * The money core every subscriptions route and job writes through: packages, balances, student
 * statuses and alerts recompute one another (R-SUB-02), so they stay one provider graph.
 */
@Module({
  imports: [PricingModule],
  providers: [
    AlertsEnv,
    AlertsRepo,
    BalanceRepo,
    CommissionBell,
    CourseDue,
    CourseDueRepo,
    FollowUpEnv,
    LeadConversion,
    MoneyFollowUps,
    MoneyWrites,
    PackagesService,
    StudentActivation,
    StudentDeactivation,
    StudentExpiryJob,
    StudentExpiryRepo,
    StudentRenewal,
    StudentStatusRepo,
    StudentTrialRepo,
    StudentTrialStatus,
    SubscriptionAlertsService,
    SubscriptionCancel,
    SubscriptionCancelRepo,
    SubscriptionCreator,
    SubscriptionsRepo,
    SubscriptionsService,
    SubscriptionsSettings,
    UnpaidFlags,
    UsedBeforeEdit,
    UsedBeforeEditRepo,
  ],
  exports: [
    AlertsRepo,
    BalanceRepo,
    CommissionBell,
    CourseDue,
    MoneyWrites,
    PackagesService,
    StudentTrialStatus,
    SubscriptionAlertsService,
    SubscriptionCancel,
    SubscriptionCreator,
    SubscriptionsRepo,
    SubscriptionsService,
    UnpaidFlags,
    UsedBeforeEdit,
  ],
})
export class SubscriptionsSharedModule {}
