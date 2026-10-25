import {
  leadStatusStyle,
  packageChip,
  subscribeKind,
  subscriptionStatusStyle,
  type LeadStatus,
  type StatusStyle,
  type SubscriptionBadge,
  type ThreadSubscriptionView,
} from '@ab/shared';
import { moneyText, progressOf } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';

// The family's subscription in the chat (R-SUB-01): the chip, each student's package line and
// which subscribe button the admin gets. The rules live in @ab/shared so mobile says the same.

/** docs/07 §6: running = settled (ok), ended = «دورك» (renew, like «الباقة خلصت»), none = neutral. */
export const badgeStyle: Record<SubscriptionBadge, StatusStyle> = {
  subscribed: { tone: 'ok', glyph: 'fill' },
  expired: { tone: 'act', glyph: 'struck' },
  none: { tone: 'neutral', glyph: 'hollow' },
};

/**
 * A lead's chip in the chat. A converted lead with no guardian on this number is «اتحول لطالب»
 * (neutral): the funnel's «مشترك» would read as a running package next to «مش مشترك».
 */
export function leadChip(status: LeadStatus): StatusStyle & { label: string } {
  if (status === 'converted') return { tone: 'neutral', glyph: 'fill', label: t.inbox.convertedLead };
  return { ...leadStatusStyle[status], label: t.enums.leadStatus[status] };
}

/** A child's chip from the package's numbers (packageChip): never «مش مدفوع» for a paid one that ran out. */
export function packageChipProps(sub: ThreadSubscriptionView): StatusStyle & { label: string } {
  const status = packageChip(sub);
  return { ...subscriptionStatusStyle[status], label: t.enums.subscriptionStatus[status] };
}

/** «8 حلقات في الشهر — فاضل 3 حلقات»; a custom count shows the lessons left only; an expired package only its name. */
export function packageLine(sub: ThreadSubscriptionView): string {
  const name = sub.package_size ? t.enums.packageSize[sub.package_size] : null;
  const left = sub.status === 'expired' ? null : progressOf(sub).remainingLabel;
  return [name, left].filter(Boolean).join(' — ');
}

/** «عليه 290 ر.س» while the newest package is not fully paid, else null. */
export function dueText(sub: Pick<ThreadSubscriptionView, 'due_amount' | 'currency'>): string | null {
  if (sub.due_amount <= 0) return null;
  return t.inbox.subscription.due.replace('{amount}', moneyText(sub.due_amount, sub.currency));
}

/** «جدّد الاشتراك» once this student's package ended or is used up, else «اشتراك جديد» (subscribeKind). */
export function subscribeLabel(sub: ThreadSubscriptionView | null): string {
  return subscribeKind(sub) === 'renew' ? t.inbox.subscription.renew : t.subscriptions.new;
}
