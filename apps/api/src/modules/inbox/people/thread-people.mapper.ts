import {
  familyUnpaid,
  studentRemaining,
  subscriptionBadge,
  type BadgeStudent,
  type BalanceView,
  type StudentBalanceView,
  type StudentStatus,
  type SubscriptionBadge,
  type SubscriptionStatus,
  type ThreadStudentView,
  type ThreadSubscriptionView,
} from '@ab/shared';
import type { BalanceRow } from '../../subscriptions/money/balance.queries';
import { cents } from '../../subscriptions/subscriptions.queries';

export interface PeopleStudentRow {
  id: string;
  code: string | null;
  name: string;
  status: StudentStatus;
  teacher: { display_name_ar: string } | null;
}

/** The newest package with the BalanceCard numbers: lessons across every package, money of this one. */
function subscriptionOf({ current, packages, remaining }: StudentBalanceView): ThreadSubscriptionView | null {
  if (!current) return null;
  const sum = (pick: (b: BalanceView) => number) => packages.reduce((n, p) => n + pick(p.balance), 0);
  return {
    id: current.id,
    status: current.status,
    package_size: current.package,
    lessons_total: sum((b) => b.lessons_total),
    lessons_used: sum((b) => b.lessons_used),
    lessons_remaining: remaining,
    price: current.price,
    currency: current.currency,
    paid_amount: current.paid,
    due_amount: Math.max(0, cents(current.price, -current.paid)),
    renews_on: current.renews_on,
    starts_on: current.starts_on,
  };
}

/** A guardian's student + GET /students/:id/balance (S6) → the chat's student card. */
export function toThreadStudent(row: PeopleStudentRow, balance: StudentBalanceView): ThreadStudentView {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? '',
    teacher_name: row.teacher?.display_name_ar ?? null,
    status: row.status,
    subscription: subscriptionOf(balance),
  };
}

export interface BadgeStudentRow {
  id: string;
  guardian_id: string;
  subscriptions: { id: string; status: SubscriptionStatus }[];
}

/** A list row's family tags: the badge («مشترك» / «اشتراكه خلص») and «مش مدفوع». */
export type FamilyTag = { badge: SubscriptionBadge; unpaid: boolean };

/** The chat's people → the same tags the list computes (subscriptionBadge, familyUnpaid). */
export const familyTag = (kids: readonly BadgeStudent[]): FamilyTag => ({
  badge: subscriptionBadge(kids),
  unpaid: familyUnpaid(kids),
});

/**
 * H1 tags per guardian, the same rule as the chat's people: each child's newest package (is_last)
 * and units left (studentRemaining).
 */
export function familyTags(students: readonly BadgeStudentRow[], balances: readonly BalanceRow[]): Map<string, FamilyTag> {
  const families = new Map<string, BadgeStudent[]>();
  for (const s of students) {
    const own = balances.filter((b) => b.student_id === s.id);
    const newestId = own.find((b) => b.is_last)?.subscription_id;
    const newest = s.subscriptions.find((x) => x.id === newestId);
    const kid = { subscription: newest ? { status: newest.status, lessons_remaining: studentRemaining(own) } : null };
    families.set(s.guardian_id, [...(families.get(s.guardian_id) ?? []), kid]);
  }
  return new Map([...families].map(([id, kids]) => [id, familyTag(kids)]));
}
