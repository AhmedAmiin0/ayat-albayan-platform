import type { DynamicModule } from '@nestjs/common';
import { featureRoot } from '@/common/infra/test-root';
import { ActivityModule } from '@/common/telemetry/activity/activity.module';
import { AssistantPayModule } from '@/modules/finance/assistant-pay';
import { ExpensesModule } from '@/modules/finance/expenses';
import { PaymentsModule } from '@/modules/finance/payments';
import { PayoutsModule } from '@/modules/finance/payouts';
import { StripeTestModule } from '@/modules/finance/stripe';
import { TeacherEarningsModule } from '@/modules/finance/teacher-earnings';
import { SalesMoneyModule } from '@/modules/sales/sales-money';
import { SubscriptionsModule } from '@/modules/finance/subscriptions/subscriptions.module';

const MONEY = [SubscriptionsModule, PaymentsModule, PayoutsModule, ExpensesModule];

/**
 * Every module behind the admin and sales money routes, plus the activity interceptor that records
 * their writes. Built per call: StripeTestModule reads FEATURE_STRIPE when it registers.
 */
export function moneyRoot(): DynamicModule {
  const more = [SalesMoneyModule, TeacherEarningsModule, AssistantPayModule, ActivityModule];
  return featureRoot(...MONEY, ...more, StripeTestModule.register());
}
