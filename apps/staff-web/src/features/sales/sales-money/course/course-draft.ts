import {
  courseLessonCount,
  courseOpensOn,
  type CourseSubscription,
  type SalesCourseView,
} from '@ab/shared';
import { counted } from '@ab/core';
import { emptyDraft, type BookingDraft } from '@/features/teaching/booking';
import type { BookHint } from '@/features/teaching/booking';
import { dateLabel } from '@/features/teaching/schedule';
import { studentLabel } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit';

// Course booking draft (R-ASST-01): fixed facts come from GET /sales/booking/course; pure.

/**
 * The wizard's starting draft; null while she can't book it herself (blocked, or no day count). The
 * day count is the view's perWeek only. A custom count keeps no package of its own: the request
 * carries courseBodyPackage (ignored by the API) and the wizard names the lesson count
 * (courseFixedText). The slot grid opens on courseOpensOn: the subscription's start, or after a
 * renewal's previous course; with `now` (ISO), never before today in the family's zone. It books
 * the lessons not taken before the platform (courseLessonCount): 1 of 8 used → 7.
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
    course: {
      perWeek,
      lessonsTotal: courseLessonCount(sub),
      package: sub.package,
      startsOn: courseOpensOn(view, now) ?? sub.starts_on,
      ...holdOf(view),
    },
  };
}

/** Hold mode: the course's picks are saved as a draft until the payment. */
const holdOf = (view: SalesCourseView): { hold?: true } => (view.hold ? { hold: true } : {});

/** The student's own teacher, preselected on the teacher step when available. */
export const courseHint = (view: SalesCourseView): BookHint | null =>
  view.student.teacher_id ? { teacherId: view.student.teacher_id, startsAt: null } : null;

export function courseFixedText(sub: CourseSubscription): string {
  const name = sub.package
    ? t.enums.packageSize[sub.package]
    : counted(t.schedule.lessonCount, sub.lessons_total);
  return t.booking.courseFixed
    .replace('{package}', name)
    .replace('{minutes}', String(sub.duration));
}

export const courseTitle = (view: SalesCourseView | undefined): string =>
  view ? `${t.booking.courseDays} — ${studentLabel(view.student)}` : t.booking.courseDays;

export const subscriptionStartsText = (sub: Pick<CourseSubscription, 'starts_on'>): string =>
  t.booking.subscriptionStarts.replace('{date}', dateLabel(sub.starts_on));
