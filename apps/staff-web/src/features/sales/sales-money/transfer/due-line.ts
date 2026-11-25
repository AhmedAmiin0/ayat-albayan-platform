import type { SalesMoneySubscriptionView } from '@ab/shared';
import { moneyText, partPaidText } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export function dueLine(sub: Pick<SalesMoneySubscriptionView, 'paid' | 'price' | 'due' | 'currency'>): string {
  return partPaidText(sub) ?? t.salesMoney.due.replace('{amount}', moneyText(sub.due, sub.currency));
}
