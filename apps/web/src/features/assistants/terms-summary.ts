import { formatAmount } from '@ab/shared';
import { formatDate } from '@/features/leads/format';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import type { AssistantTermsView } from './api';

/** A plain day (YYYY-MM-DD) shown as a date: noon UTC, so no zone moves it to another day. */
export const dayText = (day: string): string => formatDate(`${day}T12:00:00Z`);

/** «70% من سعر الاشتراك» / «50 ر.س عن كل طالب», or «غير محددة». */
export function commissionText(c: AssistantTermsView['commission']): string {
  if (!c) return t.assistants.notSet;
  return c.type === 'percent'
    ? t.assistants.commissionPercent.replace('{value}', formatAmount(c.value))
    : t.assistants.commissionFixed.replace('{amount}', moneyText(c.value, c.currency ?? ''));
}

/** «3000 ج.م», or «غير محدد». */
export function salaryText(s: AssistantTermsView['salary']): string {
  return s ? moneyText(s.amount, s.currency) : t.assistants.notSet;
}
