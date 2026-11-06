import {
  addLocalDays,
  courseDaysPerWeek,
  courseLessonCount,
  wallParts,
  type BookedCourse,
  type BookingRequest,
  type CourseSubscription,
  type DayTime,
} from '@ab/shared';
import { createHash } from 'node:crypto';

// «اختر أيام الحلقات» before the payment (owner 2026-11-06): pure rules of a course draft. Local
// dates "YYYY-MM-DD" compare as strings.

/** A package's draft as stored (subscription_course_drafts), its request parsed. */
export interface CourseDraft {
  subscriptionId: string;
  request: BookingRequest;
  savedBy: string;
  savedAt: string;
}

/**
 * The booking's idempotency key: one per saved version of the draft, so a webhook retry (or a
 * second payment event) replays the same booking (rule 8); an edit is a new booking request.
 */
export function draftRequestId(draft: Pick<CourseDraft, 'subscriptionId' | 'savedAt'>): string {
  const hex = createHash('sha256').update(`course-draft:${draft.subscriptionId}:${draft.savedAt}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const later = (a: string, b: string): string => (a > b ? a : b);

/**
 * The request booked on payment: from max(picked start, today in the family's zone); a pinned
 * first instant only while it is still ahead (the planner starts at now anyway, so a time already
 * passed today is dropped); the draft version's own idempotency key.
 */
export function confirmRequest(draft: CourseDraft, now: Date): BookingRequest {
  const { startsAt, ...req } = draft.request;
  const today = wallParts(now.toISOString(), req.tz).date;
  const startsOn = later(req.startsOn, today);
  const ahead = startsAt !== undefined && Date.parse(startsAt) > now.getTime();
  const kept = ahead && startsOn === req.startsOn;
  const pin = kept ? { startsAt } : {};
  return { ...req, startsOn, ...pin, clientRequestId: draftRequestId(draft) };
}

/** Each picked weekday with its time: its own (dayTimes) or the request's. */
function daysOf(req: BookingRequest): DayTime[] {
  const own = new Map((req.dayTimes ?? []).map((d) => [d.weekday, d.startTimeLocal]));
  return [...req.byday]
    .sort((a, b) => a - b)
    .map((weekday) => ({ weekday, startTimeLocal: own.get(weekday) ?? req.startTimeLocal }));
}

/**
 * The draft as SalesCourseView.previous: the wizard («تابِع بنفس الأيام») prefills its teacher and
 * days, old clients too. It never decides the opening day (PR #648 review: an edit may move the
 * first lesson earlier): it ends where the real previous course ends, else the day before the
 * package starts, so the slot grid opens as without a draft.
 */
export function draftCourse(
  req: BookingRequest,
  sub: CourseSubscription,
  previous: Pick<BookedCourse, 'endsOn'> | null,
): BookedCourse {
  return {
    subscriptionId: sub.id,
    teacherId: req.teacherId,
    teacherTz: req.tz,
    durationMin: sub.duration,
    tz: req.tz,
    startsOn: req.startsOn,
    endsOn: previous?.endsOn ?? addLocalDays(sub.starts_on, -1),
    running: false,
    opensOn: req.startsOn,
    days: daysOf(req),
    lessonsTotal: courseLessonCount(sub),
    perWeek: courseDaysPerWeek(sub),
  };
}
