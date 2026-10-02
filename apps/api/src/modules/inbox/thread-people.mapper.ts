import {
  studentRemaining,
  subscriptionBadge,
  type BadgeStudent,
  type BalanceView,
  type StudentBalanceView,
  type StudentStatus,
  type SubscriptionStatus,
  type ThreadStudentView,
  type ThreadSubscriptionView,
} from '@ab/shared';
import type { BalanceRow } from '../subscriptions/balance.queries';
import { cents } from '../subscriptions/subscriptions.queries';

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

/**
 * H1 «مشترك»: the guardians whose children make subscriptionBadge 'subscribed' — the same rule as
 * the chat's people, from each child's newest package (is_last) and units left (studentRemaining).
 */
export function subscribedGuardianIds(students: readonly BadgeStudentRow[], balances: readonly BalanceRow[]): Set<string> {
  const families = new Map<string, BadgeStudent[]>();
  for (const s of students) {
    const own = balances.filter((b) => b.student_id === s.id);
    const newestId = own.find((b) => b.is_last)?.subscription_id;
    const newest = s.subscriptions.find((x) => x.id === newestId);
    const kid = { subscription: newest ? { status: newest.status, lessons_remaining: studentRemaining(own) } : null };
    families.set(s.guardian_id, [...(families.get(s.guardian_id) ?? []), kid]);
  }
  return new Set([...families].filter(([, kids]) => subscriptionBadge(kids) === 'subscribed').map(([id]) => id));
}
