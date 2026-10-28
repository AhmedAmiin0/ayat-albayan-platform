import type { SalesMoneySubscriptionView } from '@ab/shared';
import { moneyText, partPaidText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

/** «المستحق 81 ر.س», or once part of it came in «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» (owner 2026-10-28). */
export function dueLine(sub: Pick<SalesMoneySubscriptionView, 'paid' | 'price' | 'due' | 'currency'>): string {
  return partPaidText(sub) ?? t.salesMoney.due.replace('{amount}', moneyText(sub.due, sub.currency));
}
