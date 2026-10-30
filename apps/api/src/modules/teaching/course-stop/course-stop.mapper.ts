import { STUDENT_STATUSES, type CourseStopped, type CourseStopResult, type StudentStatus } from '@ab/shared';
import type { StopSub } from './course-stop.repo';

/** Who stopped the package, when and why; null while it is not cancelled. */
export function toStopped(sub: StopSub): CourseStopped | null {
  if (sub.status !== 'cancelled' || sub.cancelled_at === null) return null;
  return { at: sub.cancelled_at, by: sub.cancelled_by, reason: sub.cancel_reason };
}

const ids = (v: unknown): number => (Array.isArray(v) ? v.length : 0);
const statusOf = (v: unknown): StudentStatus => STUDENT_STATUSES.find((s) => s === v) ?? 'churned';

/** The answer of a stop, from its audit row's `after` (a replay answers the first stop). */
export function toResult(input: { sub: StopSub; after: Record<string, unknown> }): CourseStopResult {
  const { sub, after } = input;
  return {
    subscriptionId: sub.id,
    cancelledLessons: ids(after.cancelled_lessons),
    endedRules: ids(after.ended_rules),
    studentStatus: statusOf(after.student_status),
    stoppedAt: sub.cancelled_at ?? new Date().toISOString(),
  };
}
