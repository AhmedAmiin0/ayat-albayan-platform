import {
  courseEndsOn,
  dayTimesFromPicks,
  PACKAGE_SIZES,
  timeGroups,
  type BookingRequest,
  type CourseBlock,
  type PackageSize,
  type SalesCourseView,
} from '@ab/shared';

// The assistant's course for the subscription she sold (R-ASST-01, owner 2026-10-18): the plan's
// package and length, the student's zone, one pick per weekday. Pure; the wizard only holds picks.

/**
 * The size the booking names: the subscription's package; a custom count (package null) sends the
 * size of its weekly days (perWeek × 4) when that is a size, else null (the admin books it).
 */
export function coursePackage(view: Pick<SalesCourseView, 'subscription' | 'perWeek'>): PackageSize | null {
  if (!view.subscription) return null;
  if (view.subscription.package) return view.subscription.package;
  const size = view.perWeek === null ? '' : String(view.perWeek * 4);
  return PACKAGE_SIZES.find((p) => p !== 'trial' && p === size) ?? null;
}

/** Why the wizard cannot go on: the API's own reason, or a count no booking can name. */
export function courseBlock(view: SalesCourseView): CourseBlock | null {
  if (view.blocked) return view.blocked;
  if (!view.subscription) return 'subscription_required';
  return view.perWeek === null || coursePackage(view) === null ? 'custom_count_admin' : null;
}

export interface CourseInput {
  view: SalesCourseView;
  teacherId: string;
  /** The picked slots (UTC instants), one per weekday of the student's zone. */
  picks: readonly string[];
  /** Idempotency key, the same on every retry of this wizard (rule 8). */
  requestId: string;
}

/** POST /sales/booking (and /check): a package for the one student, from the earliest pick. */
export function courseRequest({ view, teacherId, picks, requestId }: CourseInput): BookingRequest | null {
  const pkg = coursePackage(view);
  const picked = dayTimesFromPicks(picks, view.student.tz);
  if (!view.subscription || !pkg || !picked) return null;
  const { dayTimes, ...rule } = picked;
  return {
    kind: 'package',
    studentIds: [view.student.id],
    teacherId,
    ...rule,
    ...(dayTimes.length > 0 ? { dayTimes } : {}),
    tz: view.student.tz,
    durationMin: view.subscription.duration,
    package: pkg,
    clientRequestId: requestId,
  };
}

/** The local date of the course's last lesson (its lessons_total-th), or null. */
export function courseEnd(body: BookingRequest, lessonsTotal: number): string | null {
  return courseEndsOn({ groups: timeGroups(body), startsOn: body.startsOn, lessonsTotal });
}
