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

/** A package that still runs (lessons left, not ended): the family chip's «مشترك» for one child. */
export const running = (student: ThreadStudentView) => subscriptionBadge([student]) === 'subscribed';

/** One row of «لأيّ طالب؟»: «يوسف · AB-0183 — جدّد الاشتراك» and that child's own form. */
interface SubscribeTarget {
  label: string;
  href: Href;
}

/** One place to go; `accessibilityLabel` names the child the short pill is for. */
interface SubscribeLink {
  label: string;
  accessibilityLabel?: string;
  href: Href;
}

/** Several children qualify: the pill opens «لأيّ طالب؟», each row with its own new / renew. */
interface SubscribePick {
  label: string;
  targets: SubscribeTarget[];
}

export type SubscribeAction = SubscribeLink | SubscribePick;

interface ActionInput {
  people: ThreadPeople;
  phone: string;
  /** The thread row: the lead's WhatsApp name prefills the booking wizard's guardian. */
  thread?: Pick<ThreadView, 'lead_name' | 'display_name'> | null;
}

/**
 * The thread's one subscribe pill. A guardian: the children without a running package (else every
 * child: an early renewal or an extra package), «جدّد الاشتراك» once a package ended, else «اشتراك
 * جديد» (subscribeKind, as the web); one such child → its form (the pill's spoken name names it),
 * several → «لأيّ طالب؟». A lead with no guardian yet (a converted one too): «اشترك» → the booking
 * wizard with a package step. A lost lead or anyone else: nothing.
 */
export function subscribeAction({ people, phone, thread }: ActionInput): SubscribeAction | null {
  if (people.guardian) return guardianAction(people.students, phone);
  if (!people.lead || people.lead.status === 'lost') return null;
  const name = thread?.lead_name ?? thread?.display_name;
  const params = { leadId: people.lead.id, phone, mode: 'subscribe', ...(name ? { name } : {}) };
  return { label: s().subscribe, href: { pathname: '/inbox/book', params } };
}

function guardianAction(students: readonly ThreadStudentView[], phone: string): SubscribeAction | null {
  const open = students.filter((st) => !running(st));
  const kinds = (open.length > 0 ? open : students).map((child) => {
    const renew = subscribeKind(child.subscription) === 'renew';
    const params = { studentId: child.id, phone, ...(renew ? { renew: '1' } : {}) };
    const href: Href = { pathname: '/inbox/subscribe', params };
    return { child, renew, word: renew ? s().renew : t.subscriptions.new, href };
  });
  const [only] = kinds;
  if (!only) return null;
  if (kinds.length === 1) return { label: only.word, accessibilityLabel: `${only.word} — ${only.child.name}`, href: only.href };
  // The code tells same-name children apart (and keeps the sheet's keys unique).
  const targets = kinds.map((k) => ({ label: `${k.child.name} · ${k.child.code} — ${k.word}`, href: k.href }));
  return { label: kinds.every((k) => k.renew) ? s().renew : t.subscriptions.new, targets };
}
