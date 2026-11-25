import { formatAmount } from '@ab/money';
import { formatDate } from '@/features/sales/leads';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit';
import type { AssistantTermsView } from '@/features/people/assistants/api';

/** A plain day (YYYY-MM-DD) shown as a date: noon UTC, so no zone moves it to another day. */
export const dayText = (day: string): string => formatDate(`${day}T12:00:00Z`);

export function commissionText(c: AssistantTermsView['commission']): string {
  if (!c) return t.assistants.notSet;
  return c.type === 'percent'
    ? t.assistants.commissionPercent.replace('{value}', formatAmount(c.value))
    : t.assistants.commissionFixed.replace('{amount}', moneyText(c.value, c.currency ?? ''));
}

export function salaryText(s: AssistantTermsView['salary']): string {
  return s ? moneyText(s.amount, s.currency) : t.assistants.notSet;
}
