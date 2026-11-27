import type { SubscriptionStatus } from '@ab/catalog';
import type { z } from 'zod';
import type {
  familyRingSchema,
  subscriptionBadgeSchema,
} from '../thread-reads/thread-view.schemas';
import type { ThreadPeople, ThreadSubscriptionView } from './thread-people.schemas';

// GET /threads/:phone `people` (R-SUB-01, R-LEAD-02): who the chat is with and whether the family
// is subscribed, so the admin can renew or subscribe from the chat.

export type SubscriptionBadge = z.infer<typeof subscriptionBadgeSchema>;

export type BadgeStudent = {
  subscription: Pick<ThreadSubscriptionView, 'status' | 'lessons_remaining'> | null;
};

/** Subscribed while any child's newest package runs with lessons left; trial-only is none. */
export function subscriptionBadge(students: readonly BadgeStudent[]): SubscriptionBadge {
  const packages = students.flatMap((s) =>
    s.subscription && s.subscription.status !== 'trial' && s.subscription.status !== 'cancelled'
      ? [s.subscription]
      : [],
  );
  if (packages.some((p) => p.status !== 'expired' && p.lessons_remaining > 0)) return 'subscribed';
  return packages.length > 0 ? 'expired' : 'none';
}

/** A lead is not subscribed; a converted lead without a guardian, a teacher or unknown is null. */
export function threadBadge(
  people: Pick<ThreadPeople, 'guardian' | 'lead' | 'students'>,
): SubscriptionBadge | null {
  if (people.guardian) return subscriptionBadge(people.students);
  return people.lead && people.lead.status !== 'converted' ? 'none' : null;
}

/** Unpaid when a child's newest package still runs and owes money. */
export function familyUnpaid(students: readonly BadgeStudent[]): boolean {
  return students.some(
    (s) => s.subscription?.status === 'unpaid' && s.subscription.lessons_remaining > 0,
  );
}

/** A paid package that only ran out stays `unpaid` in the DB but must not read unpaid. */
export function packageChip(
  sub: Pick<ThreadSubscriptionView, 'status' | 'lessons_remaining' | 'due_amount'>,
): SubscriptionStatus {
  if (sub.status === 'paused' || sub.status === 'trial' || sub.status === 'cancelled')
    return sub.status;
  if (sub.status === 'expired' || sub.lessons_remaining <= 0) return 'expired';
  return sub.due_amount > 0 ? 'unpaid' : 'active';
}

/** Renew once the package ended, else a new subscription. */
export function subscribeKind(sub: BadgeStudent['subscription']): 'renew' | 'new' {
  return subscriptionBadge([{ subscription: sub }]) === 'expired' ? 'renew' : 'new';
}

/** The chat list's avatar ring: green subscribed, gray when a renewal is due. */
export type FamilyRing = z.infer<typeof familyRingSchema>;

/** Packages counting down to a renewal alert (alertFor: paused, trial, cancelled raise none). */
const COUNTING: ReadonlySet<SubscriptionStatus> = new Set(['active', 'unpaid']);

const nearEnd = (sub: BadgeStudent['subscription'], threshold: number): boolean =>
  sub !== null &&
  COUNTING.has(sub.status) &&
  sub.lessons_remaining > 0 &&
  sub.lessons_remaining <= threshold;

const RING: Record<SubscriptionBadge, (low: boolean) => FamilyRing | null> = {
  subscribed: (low) => (low ? 'renewal' : 'subscribed'),
  expired: () => 'renewal',
  none: () => null,
};

/**
 * The family's ring from subscriptionBadge and the renewal_due threshold
 * (settings.renewal_alert_remaining): every package ended → renewal; a running package of a
 * child at or below the threshold → renewal; else subscribed. No package (or trial / cancelled
 * only) → none.
 */
export function familyRing(
  students: readonly BadgeStudent[],
  threshold: number,
): FamilyRing | null {
  const low = students.some((s) => nearEnd(s.subscription, threshold));
  return RING[subscriptionBadge(students)](low);
}
