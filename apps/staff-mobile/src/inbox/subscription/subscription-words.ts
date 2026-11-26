import {
  packageChip,
  subscribeKind,
  subscriptionBadge,
  type SubscriptionBadge,
  type ThreadPeople,
  type ThreadStudentView,
  type ThreadSubscriptionView,
  type ThreadView,
} from '@ab/shared';
import { packageProgress, subscriptionStatusStyle, type StatusStyle } from '@ab/money';
import type { Href } from 'expo-router';
import { t, isolate, ltr, money } from '@ab/mobile-kit';
import { partPaidLine } from '@/core/lib/money/format';

// R-SUB-01: the rules come from @ab/shared so the list tag, the chat and the web agree.

const s = () => t.inbox.subscription;
type Chip = StatusStyle & { label: string };

/** The badge's nuqta chip: shape from the shared map, the word from ar.json. */
export function badgeChip(badge: SubscriptionBadge): Chip {
  if (badge === 'subscribed') return { ...subscriptionStatusStyle.active, label: s().badge.subscribed };
  if (badge === 'expired') return { ...subscriptionStatusStyle.expired, label: s().badge.expired };
  return { ...subscriptionStatusStyle.trial, label: s().badge.none };
}

/** Null unless the package needs the admin. */
export function childChip(sub: ThreadSubscriptionView | null): Chip | null {
  const status = sub ? packageChip(sub) : null;
  if (status !== 'unpaid' && status !== 'paused') return null;
  return { ...subscriptionStatusStyle[status], label: t.enums.subscriptionStatus[status] };
}

/** An expired package shows only its name. */
export function packageText(sub: ThreadSubscriptionView | null): string {
  if (!sub) return t.subscriptions.empty;
  const name = sub.package_size
    ? t.enums.packageSize[sub.package_size]
    : t.pricing.packages.custom.name;
  if (sub.status === 'expired') return name;
  const { remainingLabel } = packageProgress(sub.lessons_used, sub.lessons_total, {
    forms: t.subscriptions.progress,
  });
  return [name, remainingLabel].filter(Boolean).join(' · ');
}

/** Null unless the newest package owes money; a partial payment says how much came. */
export function dueLine(sub: ThreadSubscriptionView | null): string | null {
  const part = sub
    ? partPaidLine({ paid: sub.paid_amount, price: sub.price, currency: sub.currency })
    : null;
  if (part) return part;
  return sub && sub.due_amount > 0 ? s().due.replace('{amount}', money(sub.due_amount, sub.currency)) : null;
}

export const running = (student: ThreadStudentView) => subscriptionBadge([student]) === 'subscribed';

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

/** A lead with no guardian goes to the booking wizard with a package step; lost leads none. */
export function subscribeAction({ people, phone, thread }: ActionInput): SubscribeAction | null {
  if (people.guardian) return guardianAction(people.students, phone);
  if (!people.lead || people.lead.status === 'lost') return null;
  const name = thread?.lead_name ?? thread?.display_name;
  const params = { leadId: people.lead.id, phone, mode: 'subscribe', ...(name ? { name } : {}) };
  return { label: s().subscribe, href: { pathname: '/inbox/book', params } };
}

function guardianAction(
  students: readonly ThreadStudentView[],
  phone: string,
): SubscribeAction | null {
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
  // The code tells same-name children apart (and keeps the sheet's keys unique); isolated, a Latin name
  // and the code never merge into one LTR run in an Arabic row.
  const targets = kinds.map((k) => ({ label: `${isolate(k.child.name)} · ${ltr(k.child.code)} — ${k.word}`, href: k.href }));
  return { label: kinds.every((k) => k.renew) ? s().renew : t.subscriptions.new, targets };
}
