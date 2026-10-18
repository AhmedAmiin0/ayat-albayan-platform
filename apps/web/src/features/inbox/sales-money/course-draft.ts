import { counted, courseOpensOn, type CourseSubscription, type SalesCourseView } from '@ab/shared';
import { emptyDraft, type BookingDraft } from '@/features/booking/draft';
import type { BookHint } from '@/features/booking/hint';
import { dateLabel } from '@/features/schedule/tz';
import { studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';

// «أيام الحلقات» (owner 2026-10-18, R-ASST-01): the booking wizard's draft for the course of a
// subscription she sold. Student, package, length, zone, program and teacher preference come from
// GET /sales/booking/course; she picks the teacher and one time per day. Pure.

/**
 * The wizard's starting draft; null while she can't book it herself (blocked, or no day count). The
 * day count is the view's perWeek only. A custom count keeps no package of its own: the request
 * carries courseBodyPackage (ignored by the API) and the wizard names the lesson count (courseFixedText).
 * The slot grid opens on courseOpensOn: the subscription's start, or after a renewal's previous course;
 * with `now` (ISO), never before today in the family's zone.
 */
export function courseDraft(view: SalesCourseView, now?: string): BookingDraft | null {
  const { student, subscription: sub, perWeek } = view;
  if (view.blocked || !sub || perWeek === null) return null;
  return {
    ...emptyDraft({ kind: 'package' }),
    students: [{ id: student.id, name: student.name, code: student.code }],
    tz: student.tz,
    program: student.program,
    genderPref: student.teacher_gender_pref,
    durationMin: sub.duration,
    ...(sub.package ? { pkg: sub.package } : {}),
    course: { perWeek, lessonsTotal: sub.lessons_total, package: sub.package, startsOn: courseOpensOn(view, now) ?? sub.starts_on },
  };
}

/** The student's own teacher, preselected on the teacher step when available. */
export const courseHint = (view: SalesCourseView): BookHint | null =>
  view.student.teacher_id ? { teacherId: view.student.teacher_id, startsAt: null } : null;

/** «الباقة ومدة الحلقة من الاشتراك: 8 حلقات في الشهر · 45 دقيقة». */
export function courseFixedText(sub: CourseSubscription): string {
  const name = sub.package ? t.enums.packageSize[sub.package] : counted(t.schedule.lessonCount, sub.lessons_total);
  return t.booking.courseFixed.replace('{package}', name).replace('{minutes}', String(sub.duration));
}

/** «أيام الحلقات — سهيلة · AB-0183» once the view names the child. */
export const courseTitle = (view: SalesCourseView | undefined): string =>
  view ? `${t.booking.courseDays} — ${studentLabel(view.student)}` : t.booking.courseDays;

/** «يبدأ الاشتراك في 3 أكتوبر 2026». */
export const subscriptionStartsText = (sub: Pick<CourseSubscription, 'starts_on'>): string =>
  t.booking.subscriptionStarts.replace('{date}', dateLabel(sub.starts_on));
