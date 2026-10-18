import { dayTimesKeeping, type CourseChangeRequest, type PrefilledPick } from '@ab/shared';

// «تغيير أيام الحلقات» (owner 2026-10-18): new weekdays and times for the lessons of a running course
// that have not happened yet. The teacher, the length and the zone stay the course's. Pure. The
// slot step's first picks are shared changePicks (from max(today, the course's first day)).

export interface ChangeInput {
  subscriptionId: string;
  /** The picked slots (UTC instants), one per weekday of `tz`. */
  picks: readonly string[];
  /** The course's zone (its rules'). */
  tz: string;
  /** Idempotency key, the same on every retry of this flow (rule 8). */
  requestId: string;
  /** The first picks (changePicks): a day still on one keeps its own time (DST-safe). */
  prefilled: readonly PrefilledPick[];
}

/** POST /sales/booking/course/change (and …/check): the change point is the earliest pick; null without one. */
export function changeRequest({ subscriptionId, picks, tz, requestId, prefilled }: ChangeInput): CourseChangeRequest | null {
  const picked = dayTimesKeeping(picks, tz, prefilled);
  if (!picked) return null;
  const { dayTimes, ...rule } = picked;
  return { subscriptionId, ...rule, ...(dayTimes.length > 0 ? { dayTimes } : {}), clientRequestId: requestId };
}
