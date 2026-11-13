import type { Tables } from '@ab/db';
import { countsForMoney, isCancelled, type TeacherCourseView } from '@ab/shared';
import type { CoursePackageRow } from '@/modules/sales/sales-students/attendance/student-attendance.rows';

/** A package's balance (v_subscription_balance), as SalesRosterRepo.balances reads it. */
export type CourseBalance = Pick<
  Tables<'v_subscription_balance'>,
  'subscription_id' | 'lessons_used' | 'remaining' | 'ended_at' | 'projected_end_at'
>;

const balanceOf = (balances: readonly CourseBalance[], id: string): CourseBalance | undefined =>
  balances.find((b) => b.subscription_id === id);

/**
 * The course she is teaching (docs/47): of the packages that count (an unused cancel is out; a
 * stopped one stays), the OLDEST that is not cancelled and has lessons left (the one
 * v_subscription_balance consumes FIFO), so a paid renewal never hides it; else the newest that
 * counts; else null. A stopped package is never running: its remaining stays above 0.
 */
export function teacherCourseOf(
  newestFirst: readonly CoursePackageRow[],
  balances: readonly CourseBalance[],
): CoursePackageRow | null {
  const live = newestFirst.filter(countsForMoney);
  const hasLeft = (p: CoursePackageRow): boolean => (balanceOf(balances, p.id)?.remaining ?? 0) > 0;
  const running = [...live].reverse().find((p) => !isCancelled(p) && hasLeft(p));
  return running ?? live[0] ?? null;
}

const isoOrNull = (at: string | null | undefined): string | null =>
  at ? new Date(at).toISOString() : null;

/** «توقفت الدورة»: when a stopped package was stopped; null for any other package. */
const stoppedAt = (p: CoursePackageRow): string | null =>
  p.cancel_kind === 'stopped' ? isoOrNull(p.cancelled_at) : null;

/** Used and left; without a balance row nothing is used yet. Left never reads below 0. */
function counts(p: CoursePackageRow, b: CourseBalance | undefined) {
  const used = b?.lessons_used ?? 0;
  const remaining = b?.remaining ?? p.lessons_total - used;
  return { lessons_used: used, lessons_remaining: Math.max(0, remaining) };
}

/**
 * The teacher's view of the pick: dates and lesson counts only. Never its id, status, cancel kind
 * or reason, renews_on or any money (docs/47 whitelist).
 */
export function toTeacherCourse(
  pick: CoursePackageRow | null,
  balance: CourseBalance | undefined,
): TeacherCourseView | null {
  if (pick === null) return null;
  return {
    starts_on: pick.starts_on,
    stopped_at: stoppedAt(pick),
    ended_at: isoOrNull(balance?.ended_at),
    projected_end_at: isoOrNull(balance?.projected_end_at),
    lessons_total: pick.lessons_total,
    ...counts(pick, balance),
  };
}

/** The file head's course line from the student's packages and their balances. */
export function courseOf(
  newestFirst: readonly CoursePackageRow[],
  balances: readonly CourseBalance[],
): TeacherCourseView | null {
  const pick = teacherCourseOf(newestFirst, balances);
  return toTeacherCourse(pick, pick === null ? undefined : balanceOf(balances, pick.id));
}
