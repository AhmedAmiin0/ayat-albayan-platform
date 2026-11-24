import type { SalesMoneySubscriptionView } from '@ab/shared';
import { t, money } from '@ab/mobile-kit';
import { packageName } from '@/core/lib/money/format';

// Words for one of her open packages. Pure.

export function packageLabel(sub: SalesMoneySubscriptionView): string {
  return `${t.salesMoney.packageFor.replace('{student}', sub.student.name)} · ${packageName(sub)}`;
}

export function dueText(sub: Pick<SalesMoneySubscriptionView, 'due' | 'currency'>): string {
  return t.salesMoney.due.replace('{amount}', money(sub.due, sub.currency));
}
