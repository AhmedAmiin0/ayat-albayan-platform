import type { LeadStatus, PackageSize, StudentStatus, SubscriptionStatus } from '@ab/catalog';

// GET /threads/:phone `people` (R-SUB-01, R-LEAD-02): who the chat is with and whether the family
// is subscribed, so the admin can renew or subscribe from the chat.

/** A student's newest package (FIFO) with the money and lesson numbers of the BalanceCard. */
export interface ThreadSubscriptionView {
  id: string;
  status: SubscriptionStatus;
  /** null = a custom lesson count. */
  package_size: PackageSize | null;
  /**
   * Lessons across all the student's packages (like the BalanceCard line, studentProgress):
   * packageProgress(lessons_used, lessons_total) gives «فاضل حلقتين».
   */
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

/**
 * The family's «مشترك» state: subscribed while any child's newest package is running (active,
 * unpaid or paused, with lessons left); expired when the newest packages are expired or used up;
 * none without packages (or with a trial or cancelled package only).
 */
export function subscriptionBadge(students: readonly BadgeStudent[]): SubscriptionBadge {
  const packages = students.flatMap((s) => (s.subscription && s.subscription.status !== 'trial' && s.subscription.status !== 'cancelled' ? [s.subscription] : []));
  if (packages.some((p) => p.status !== 'expired' && p.lessons_remaining > 0)) return 'subscribed';
  return packages.length > 0 ? 'expired' : 'none';
}

/**
 * The chat's family chip: a guardian's subscriptionBadge; «مش مشترك» for a lead; null for a
 * converted lead with no guardian on this number (its «مشترك» is the funnel status, not a package),
 * a teacher or an unknown number.
 */
export function threadBadge(people: Pick<ThreadPeople, 'guardian' | 'lead' | 'students'>): SubscriptionBadge | null {
  if (people.guardian) return subscriptionBadge(people.students);
  return people.lead && people.lead.status !== 'converted' ? 'none' : null;
}

/**
 * «مش مدفوع» on a list row: a child's newest package is unpaid while it still runs (money owed;
 * a fully paid package with lessons left is `active`, a used-up one is the «اشتراكه خلص» badge).
 */
export function familyUnpaid(students: readonly BadgeStudent[]): boolean {
  return students.some((s) => s.subscription?.status === 'unpaid' && s.subscription.lessons_remaining > 0);
}

/**
 * A child's package chip in the chat, from its numbers: paused / trial / cancelled as set; ended (expired or
 * used up) → expired; money owed → unpaid; else active. A paid package that only ran out stays
 * `unpaid` in the DB until renewed (subscriptionStatusFor), and must not read «مش مدفوع».
 */
export function packageChip(sub: Pick<ThreadSubscriptionView, 'status' | 'lessons_remaining' | 'due_amount'>): SubscriptionStatus {
  if (sub.status === 'paused' || sub.status === 'trial' || sub.status === 'cancelled') return sub.status;
  if (sub.status === 'expired' || sub.lessons_remaining <= 0) return 'expired';
  return sub.due_amount > 0 ? 'unpaid' : 'active';
}

/** Which subscribe button a child gets: «جدّد الاشتراك» once its package ended, else «اشتراك جديد». */
export function subscribeKind(sub: BadgeStudent['subscription']): 'renew' | 'new' {
  return subscriptionBadge([{ subscription: sub }]) === 'expired' ? 'renew' : 'new';
}
