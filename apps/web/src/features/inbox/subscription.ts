import {
  subscriptionBadge,
  type StatusStyle,
  type SubscriptionBadge,
  type ThreadPeople,
  type ThreadSubscriptionView,
} from '@ab/shared';
import { moneyText, progressOf } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';

// The family's subscription in the chat (R-SUB-01): the chip, each student's package line and
// which subscribe button the admin gets.

/** docs/07 §6: running = settled (ok), ended = «دورك» (renew, like «الباقة خلصت»), none = neutral. */
export const badgeStyle: Record<SubscriptionBadge, StatusStyle> = {
  subscribed: { tone: 'ok', glyph: 'fill' },
  expired: { tone: 'act', glyph: 'struck' },
  none: { tone: 'neutral', glyph: 'hollow' },
};

/** A guardian's family badge, «مش مشترك» for a lead, null for a teacher or an unknown number. */
export function threadBadge(people: ThreadPeople): SubscriptionBadge | null {
  if (people.guardian) return subscriptionBadge(people.students);
  return people.lead ? 'none' : null;
}

/** «8 حلقات في الشهر — فاضل 3 حلقات»; a custom count shows the lessons left only. */
export function packageLine(sub: ThreadSubscriptionView): string {
  const name = sub.package_size ? t.enums.packageSize[sub.package_size] : null;
  return [name, progressOf(sub).remainingLabel].filter(Boolean).join(' — ');
}

/** «عليه 290 ر.س» while the newest package is not fully paid, else null. */
export function dueText(sub: Pick<ThreadSubscriptionView, 'due_amount' | 'currency'>): string | null {
  if (sub.due_amount <= 0) return null;
  return t.inbox.subscription.due.replace('{amount}', moneyText(sub.due_amount, sub.currency));
}

/** «جدّد الاشتراك» once this student's package ended or is used up, else «اشتراك جديد». */
export function subscribeLabel(sub: ThreadSubscriptionView | null): string {
  return subscriptionBadge([{ subscription: sub }]) === 'expired' ? t.inbox.subscription.renew : t.subscriptions.new;
}
