import {
  packageProgress,
  subscriptionBadge,
  subscriptionStatusStyle,
  type StatusStyle,
  type SubscriptionBadge,
  type ThreadPeople,
  type ThreadStudentView,
  type ThreadView,
} from '@ab/shared';
import type { Href } from 'expo-router';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';

// A chat's «مشترك» / «اشتراكه خلص» / «مش مشترك» and the subscribe button (R-SUB-01): pure, from
// GET /threads/:phone `people`. The badge is the API's own subscriptionBadge, so the list tag and
// the chat always agree.

const s = () => t.inbox.subscription;

/** The badge's nuqta chip: shape from the shared map, the word from ar.json. */
export function badgeChip(badge: SubscriptionBadge): StatusStyle & { label: string } {
  if (badge === 'subscribed') return { ...subscriptionStatusStyle.active, label: s().badge.subscribed };
  if (badge === 'expired') return { ...subscriptionStatusStyle.expired, label: s().badge.expired };
  return { ...subscriptionStatusStyle.trial, label: s().badge.none };
}

/** «يوسف · 8 حلقات في الشهر · فاضل حلقتين · عليه 145 ر.س», or «يوسف · مش مشترك». */
export function studentLine(student: ThreadStudentView): string {
  const sub = student.subscription;
  if (!sub) return `${student.name} · ${s().badge.none}`;
  const name = sub.package_size
    ? t.enums.packageSize[sub.package_size]
    : t.pricing.packages.custom.name;
  const left = packageProgress(sub.lessons_used, sub.lessons_total, {
    forms: t.subscriptions.progress,
  }).remainingLabel;
  const due =
    sub.due_amount > 0 ? s().due.replace('{amount}', money(sub.due_amount, sub.currency)) : null;
  return [student.name, name, left, due].filter(Boolean).join(' · ');
}

const running = (student: ThreadStudentView) => subscriptionBadge([student]) === 'subscribed';

export interface SubscribeAction {
  label: string;
  href: Href;
}

export interface ActionInput {
  people: ThreadPeople;
  phone: string;
  /** The thread row: the lead's WhatsApp name prefills the booking wizard's guardian. */
  thread?: Pick<ThreadView, 'lead_name' | 'display_name'> | null;
}

/**
 * The thread's one subscribe button. A guardian: «اشتراك جديد» / «جدّد» for the first child
 * without a running package (else the first child) → the subscribe screen. A lead with no
 * guardian yet: «اشترك» → the booking wizard with a package step. Anyone else: nothing.
 */
export function subscribeAction({ people, phone, thread }: ActionInput): SubscribeAction | null {
  if (people.guardian) {
    const child = people.students.find((st) => !running(st)) ?? people.students[0];
    if (!child) return null;
    const fresh = subscriptionBadge([child]) === 'none';
    return {
      label: fresh ? t.subscriptions.new : s().renew,
      href: { pathname: '/inbox/subscribe', params: { studentId: child.id, phone } },
    };
  }
  if (!people.lead) return null;
  const name = thread?.lead_name ?? thread?.display_name;
  const params = { leadId: people.lead.id, phone, mode: 'subscribe', ...(name ? { name } : {}) };
  return { label: s().subscribe, href: { pathname: '/inbox/book', params } };
}
