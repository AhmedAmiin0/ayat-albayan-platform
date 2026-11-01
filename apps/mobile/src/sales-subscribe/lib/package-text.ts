import type { SalesMoneySubscriptionView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { money, packageName } from '@/core/lib/money/format';

// Words for one of her open packages. Pure.

/** «باقة يوسف · 12 حلقة في الشهر». */
export function packageLabel(sub: SalesMoneySubscriptionView): string {
  return `${t.salesMoney.packageFor.replace('{student}', sub.student.name)} · ${packageName(sub)}`;
}

/** «المتبقي: 180 ر.س». */
export function dueText(sub: Pick<SalesMoneySubscriptionView, 'due' | 'currency'>): string {
  return t.salesMoney.due.replace('{amount}', money(sub.due, sub.currency));
}
