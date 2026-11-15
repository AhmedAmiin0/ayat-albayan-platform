import { dayTimesKeeping, type CourseChangeRequest, type PrefilledPick } from '@ab/shared';

// «تغيير أيام الحلقات» (owner 2026-10-18): new weekdays and times for the lessons of a running course
// that have not happened yet. The teacher, the length and the zone stay the course's. Pure. The
// slot step's first picks are shared changePicks (from the later of changeOpensOn and startsOn).

interface ChangeInput {
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

/**
 * The student profile's «تغيير المعلم» / «تغيير موعد الحلقات» (owner 2026-10-30): the same
 * flow against another route, optionally with a new teacher (its slots and the body's
 * teacherId), straight to the review with the course's own days (a teacher change keeping
 * them), and the admin's clash override.
 */
export interface ChangeTarget {
  /** POST `${path}/check` and `${path}`. */
  path: string;
  teacherId?: string | undefined;
  title?: string | undefined;
  /** Open on the review with the course's own (prefilled) days. */
  review?: boolean | undefined;
  /** The admin: a clash may be saved with a reason (override.reason). */
  override?: boolean | undefined;
}

/** The target's route; undefined = the assistant's own. */
export const targetPath = (target: ChangeTarget | undefined): string | undefined => target?.path;

/** The body with the target's new teacher, when it has one. */
export function withTeacher(
  body: CourseChangeRequest | null,
  target?: ChangeTarget,
): (CourseChangeRequest & { teacherId?: string }) | null {
  if (!body || target?.teacherId === undefined) return body;
  return { ...body, teacherId: target.teacherId };
}

/** The admin's «احفظ رغم التعارض»: the body with override.reason; none = the body as it is. */
export function withOverride(
  body: CourseChangeRequest,
  reason: string | undefined,
): CourseChangeRequest {
  return reason ? { ...body, override: { reason } } : body;
}
