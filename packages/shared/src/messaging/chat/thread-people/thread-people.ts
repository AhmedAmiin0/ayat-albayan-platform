import type { LeadStatus, PackageSize, StudentStatus, SubscriptionStatus } from '@ab/catalog';

// GET /threads/:phone `people` (R-SUB-01, R-LEAD-02): who the chat is with and whether the family
// is subscribed, so the admin can renew or subscribe from the chat.

/** A student's newest package (FIFO) with the money and lesson numbers of the BalanceCard. */
export interface ThreadSubscriptionView {
  id: string;
  status: SubscriptionStatus;
  /** null = a custom lesson count. */
  package_size: PackageSize | null;
  /** Lessons across all the student's packages, fed to packageProgress like studentProgress. */
  lessons_total: number;
  lessons_used: number;
  /** lessons_total − lessons_used; negative = attended past every package. */
  lessons_remaining: number;
  /** This package's price after discount, in `currency`. */
  price: number;
  currency: string;
  /** Sum of this package's payments in `currency`. */
  paid_amount: number;
  /** max(0, price − paid_amount). */
  due_amount: number;
  renews_on: string | null;
  /** Local date YYYY-MM-DD. */
  starts_on: string;
}

export interface ThreadStudentView {
  id: string;
  name: string;
  /** AB-nnnn. */
  code: string;
  teacher_name: string | null;
  status: StudentStatus;
  /** null = no package yet (subscribe). */
  subscription: ThreadSubscriptionView | null;
}

export interface ThreadPeople {
  /** The guardian whose phone is this thread (guardians.phone_e164). */
  guardian: { id: string; name: string } | null;
  lead: { id: string; status: LeadStatus } | null;
  /** Every student of the guardian, oldest first; [] without a guardian. */
  students: ThreadStudentView[];
}

export type SubscriptionBadge = 'subscribed' | 'expired' | 'none';

export type BadgeStudent = {
  subscription: Pick<ThreadSubscriptionView, 'status' | 'lessons_remaining'> | null;
};

/** Subscribed while any child's newest package runs with lessons left; trial-only is none. */
export function subscriptionBadge(students: readonly BadgeStudent[]): SubscriptionBadge {
  const packages = students.flatMap((s) => (s.subscription && s.subscription.status !== 'trial' && s.subscription.status !== 'cancelled' ? [s.subscription] : []));
  if (packages.some((p) => p.status !== 'expired' && p.lessons_remaining > 0)) return 'subscribed';
  return packages.length > 0 ? 'expired' : 'none';
}

/** A lead is not subscribed; a converted lead without a guardian, a teacher or unknown is null. */
export function threadBadge(people: Pick<ThreadPeople, 'guardian' | 'lead' | 'students'>): SubscriptionBadge | null {
  if (people.guardian) return subscriptionBadge(people.students);
  return people.lead && people.lead.status !== 'converted' ? 'none' : null;
}

/** Unpaid when a child's newest package still runs and owes money. */
export function familyUnpaid(students: readonly BadgeStudent[]): boolean {
  return students.some((s) => s.subscription?.status === 'unpaid' && s.subscription.lessons_remaining > 0);
}

/** A paid package that only ran out stays `unpaid` in the DB but must not read unpaid. */
export function packageChip(sub: Pick<ThreadSubscriptionView, 'status' | 'lessons_remaining' | 'due_amount'>): SubscriptionStatus {
  if (sub.status === 'paused' || sub.status === 'trial' || sub.status === 'cancelled') return sub.status;
  if (sub.status === 'expired' || sub.lessons_remaining <= 0) return 'expired';
  return sub.due_amount > 0 ? 'unpaid' : 'active';
}

/** Renew once the package ended, else a new subscription. */
export function subscribeKind(sub: BadgeStudent['subscription']): 'renew' | 'new' {
  return subscriptionBadge([{ subscription: sub }]) === 'expired' ? 'renew' : 'new';
}

/** The chat list's avatar ring: green subscribed, gray when a renewal is due. */
export type FamilyRing = 'subscribed' | 'renewal';

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

/** ThreadView.ring: familyRing on the API; null/absent (a lead, a teacher, an old cache) = none. */
export interface FamilyRingField {
  ring?: FamilyRing | null;
}

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
