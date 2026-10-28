import {
  packageChip,
  packageProgress,
  subscribeKind,
  subscriptionBadge,
  subscriptionStatusStyle,
  type StatusStyle,
  type SubscriptionBadge,
  type ThreadPeople,
  type ThreadStudentView,
  type ThreadSubscriptionView,
  type ThreadView,
} from '@ab/shared';
import type { Href } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { money, partPaidLine } from '@/payments/format';

// A chat's «مشترك» / «الباقة خلصت» / «مش مشترك» and the subscribe button (R-SUB-01): pure, from
// GET /threads/:phone `people`. The rules (badge, child chip, new vs renew) are @ab/shared's, so
// the list tag, the chat and the web all agree.

const s = () => t.inbox.subscription;
type Chip = StatusStyle & { label: string };

/** The badge's nuqta chip: shape from the shared map, the word from ar.json. */
export function badgeChip(badge: SubscriptionBadge): Chip {
  if (badge === 'subscribed') return { ...subscriptionStatusStyle.active, label: s().badge.subscribed };
  if (badge === 'expired') return { ...subscriptionStatusStyle.expired, label: s().badge.expired };
  return { ...subscriptionStatusStyle.trial, label: s().badge.none };
}

/** A child's chip when the package needs the admin («مش مدفوع», «متوقف مؤقتًا»), like the web; else null. */
export function childChip(sub: ThreadSubscriptionView | null): Chip | null {
  const status = sub ? packageChip(sub) : null;
  if (status !== 'unpaid' && status !== 'paused') return null;
  return { ...subscriptionStatusStyle[status], label: t.enums.subscriptionStatus[status] };
}

/** «8 حلقات في الشهر · فاضل حلقتين»; an expired package by its name only; the web's «no package» line without one. */
export function packageText(sub: ThreadSubscriptionView | null): string {
  if (!sub) return t.subscriptions.empty;
  const name = sub.package_size ? t.enums.packageSize[sub.package_size] : t.pricing.packages.custom.name;
  if (sub.status === 'expired') return name;
  const { remainingLabel } = packageProgress(sub.lessons_used, sub.lessons_total, { forms: t.subscriptions.progress });
  return [name, remainingLabel].filter(Boolean).join(' · ');
}

/** «عليه 145 ر.س» while the newest package owes money («مدفوعة جزئيًا: …» once part of it came, owner 2026-10-28), else null. */
export function dueLine(sub: ThreadSubscriptionView | null): string | null {
  const part = sub ? partPaidLine({ paid: sub.paid_amount, price: sub.price, currency: sub.currency }) : null;
  if (part) return part;
  return sub && sub.due_amount > 0 ? s().due.replace('{amount}', money(sub.due_amount, sub.currency)) : null;
}

const running = (student: ThreadStudentView) => subscriptionBadge([student]) === 'subscribed';

interface SubscribeAction {
  label: string;
  href: Href;
}

interface ActionInput {
  people: ThreadPeople;
  phone: string;
  /** The thread row: the lead's WhatsApp name prefills the booking wizard's guardian. */
  thread?: Pick<ThreadView, 'lead_name' | 'display_name'> | null;
}

/**
 * The thread's one subscribe button. A guardian: the first child without a running package (else
 * the first child), «جدّد الاشتراك» once its package ended, else «اشتراك جديد» (subscribeKind, as
 * the web); with several children it names the child. A lead with no guardian yet (a converted one
 * too): «اشترك» → the booking wizard with a package step. A lost lead or anyone else: nothing.
 */
export function subscribeAction({ people, phone, thread }: ActionInput): SubscribeAction | null {
  if (people.guardian) return guardianAction(people.students, phone);
  if (!people.lead || people.lead.status === 'lost') return null;
  const name = thread?.lead_name ?? thread?.display_name;
  const params = { leadId: people.lead.id, phone, mode: 'subscribe', ...(name ? { name } : {}) };
  return { label: s().subscribe, href: { pathname: '/inbox/book', params } };
}

function guardianAction(students: readonly ThreadStudentView[], phone: string): SubscribeAction | null {
  const child = students.find((st) => !running(st)) ?? students[0];
  if (!child) return null;
  const renew = subscribeKind(child.subscription) === 'renew';
  const word = renew ? s().renew : t.subscriptions.new;
  const label = students.length > 1 ? `${word} — ${child.name}` : word;
  const params = { studentId: child.id, phone, ...(renew ? { renew: '1' } : {}) };
  return { label, href: { pathname: '/inbox/subscribe', params } };
}
