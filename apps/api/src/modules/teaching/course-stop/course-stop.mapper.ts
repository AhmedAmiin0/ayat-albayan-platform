import {
  STUDENT_STATUSES,
  type CourseStopped,
  type CourseStopRefunded,
  type CourseStopResult,
} from '@ab/shared';
import { z } from 'zod';
import type { StopSub } from './course-stop.repo';
import type { OwedDecision } from './refund';

/** course_stop_plan (migration 991): what a stop would take now. */
const planSchema = z.object({
  rule_ids: z.array(z.string()),
  lessons: z.array(z.object({ id: z.string(), status: z.string() })),
  unattributed: z.boolean(),
});
export type StopPlan = z.infer<typeof planSchema>;
export const stopPlan = (data: unknown): StopPlan => planSchema.parse(data);

/** stop_course's answer (the first stop's audit `after` on a replay). */
const rowSchema = z.object({
  cancelled_lessons: z.array(z.string()),
  ended_rules: z.array(z.string()),
  student_status: z.enum(STUDENT_STATUSES),
  stopped_at: z.string(),
  replayed: z.boolean(),
});
export type StopRow = z.infer<typeof rowSchema>;
export const stopRow = (data: unknown): StopRow => rowSchema.parse(data);

/** Who stopped the package, when and why; null while it is not cancelled. */
export function toStopped(sub: StopSub): CourseStopped | null {
  if (sub.status !== 'cancelled' || sub.cancelled_at === null) return null;
  return { at: sub.cancelled_at, by: sub.cancelled_by, reason: sub.cancel_reason };
}

const isThisStop = (sub: StopSub, requestId: string): boolean =>
  sub.status === 'cancelled' && sub.stop_request_id === requestId;

/**
 * What the stop with `requestId` stored (review 2026-11-06): a retry after a failed refund or a
 * crash plans from it, never from live lessons or the live rate; null before that stop commits
 * (or for a stop that stored nothing: an old API's, the backfill's job).
 */
export function storedOwed(sub: StopSub, requestId: string): OwedDecision | null {
  const { stop_owed_amount: amount, stop_owed_choice: choice } = sub;
  const known = amount !== null && choice !== null && isThisStop(sub, requestId);
  return known ? { amount: Number(amount), choice } : null;
}

/** The answer of a stop (a replay answers the first stop). */
export function toResult(
  subscriptionId: string,
  row: StopRow,
  refund: CourseStopRefunded | null,
): CourseStopResult {
  return {
    subscriptionId,
    cancelledLessons: row.cancelled_lessons.length,
    endedRules: row.ended_rules.length,
    studentStatus: row.student_status,
    stoppedAt: new Date(row.stopped_at).toISOString(),
    refund,
  };
}
