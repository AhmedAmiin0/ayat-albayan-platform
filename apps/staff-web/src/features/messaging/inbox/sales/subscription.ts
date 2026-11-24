import {
  packageChip,
  subscribeKind,
  type SubscriptionBadge,
  type ThreadSubscriptionView,
} from '@ab/shared';
import type { LeadStatus } from '@ab/catalog';
import { leadStatusStyle, subscriptionStatusStyle, type StatusStyle } from '@ab/money';
import { moneyText, progressOf } from '@/features/finance/subscriptions';
import { partPaidText } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// The family's subscription in the chat (R-SUB-01): the chip, each student's package line and
// which subscribe button the admin gets. The rules live in @ab/shared so mobile says the same.

/** docs/07 §6: running is settled, ended is the action tone, none is neutral. */
export const badgeStyle: Record<SubscriptionBadge, StatusStyle> = {
  subscribed: { tone: 'ok', glyph: 'fill' },
  expired: { tone: 'act', glyph: 'struck' },
  none: { tone: 'neutral', glyph: 'hollow' },
};

/** A converted lead with no guardian here is neutral, not mistaken for a running package. */
export function leadChip(status: LeadStatus): StatusStyle & { label: string } {
  if (status === 'converted') return { tone: 'neutral', glyph: 'fill', label: t.inbox.convertedLead };
  return { ...leadStatusStyle[status], label: t.enums.leadStatus[status] };
}

/** Never shows unpaid for a paid package that ran out. */
export function packageChipProps(sub: ThreadSubscriptionView): StatusStyle & { label: string } {
  const status = packageChip(sub);
  return { ...subscriptionStatusStyle[status], label: t.enums.subscriptionStatus[status] };
}

/** A custom count shows only the lessons left; an expired package shows only its name. */
export function packageLine(sub: ThreadSubscriptionView): string {
  const name = sub.package_size ? t.enums.packageSize[sub.package_size] : null;
  const left = sub.status === 'expired' ? null : progressOf(sub).remainingLabel;
  return [name, left].filter(Boolean).join(' — ');
}

/** Null when fully paid; a partly paid package still counts as unpaid until paid in full. */
export function dueText(sub: Pick<ThreadSubscriptionView, 'due_amount' | 'paid_amount' | 'price' | 'currency'>): string | null {
  if (sub.due_amount <= 0) return null;
  const part = partPaidText({ paid: sub.paid_amount, price: sub.price, currency: sub.currency });
  if (part) return part;
  return t.inbox.subscription.due.replace('{amount}', moneyText(sub.due_amount, sub.currency));
}

export function subscribeLabel(sub: ThreadSubscriptionView | null): string {
  return subscribeKind(sub) === 'renew' ? t.inbox.subscription.renew : t.subscriptions.new;
}
