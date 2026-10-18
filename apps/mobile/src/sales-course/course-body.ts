import {
  courseBodyPackage,
  courseEndsOn,
  dayTimesKeeping,
  timeGroups,
  type BookingRequest,
  type CourseBlock,
  type PrefilledPick,
  type SalesCourseView,
} from '@ab/shared';

// The assistant's course for the subscription she sold (R-ASST-01, owner 2026-10-18): the plan's
// package and length, the student's zone, one pick per weekday. Pure; the wizard only holds picks.

/** Why the wizard cannot go on: the API's own reason, or days a week it could not count. */
export function courseBlock(view: SalesCourseView): CourseBlock | null {
  if (view.blocked) return view.blocked;
  if (!view.subscription) return 'subscription_required';
  return view.perWeek === null ? 'custom_count_admin' : null;
}

export interface CourseInput {
  view: SalesCourseView;
  teacherId: string;
  /** The picked slots (UTC instants), one per weekday of the student's zone. */
  picks: readonly string[];
  /** Idempotency key, the same on every retry of this wizard (rule 8). */
  requestId: string;
  /** «تابِع بنفس الأيام»'s prefilled picks: a day still on one keeps its own time (DST-safe). */
  prefilled?: readonly PrefilledPick[];
}

/**
 * POST /sales/booking (and /check): a package course for the one student, from the earliest pick.
 * Its `package` only satisfies the schema (courseBodyPackage: a custom count sends '8'); the API
 * labels the rule with the subscription's own package, and so does every label here.
 */
export function courseRequest({ view, teacherId, picks, requestId, prefilled = [] }: CourseInput): BookingRequest | null {
  const picked = dayTimesKeeping(picks, view.student.tz, prefilled);
  if (!view.subscription || !picked) return null;
  const { dayTimes, ...rule } = picked;
  return {
    kind: 'package',
    studentIds: [view.student.id],
    teacherId,
    ...rule,
    ...(dayTimes.length > 0 ? { dayTimes } : {}),
    tz: view.student.tz,
    durationMin: view.subscription.duration,
    package: courseBodyPackage(view.subscription),
    clientRequestId: requestId,
  };
}

/** The local date of the course's last lesson (its lessons_total-th), or null. */
export function courseEnd(body: BookingRequest, lessonsTotal: number): string | null {
  return courseEndsOn({ groups: timeGroups(body), startsOn: body.startsOn, lessonsTotal });
}
