import { counted, PACKAGE_SIZES, type CourseSubscription, type PackageSize, type SalesCourseView } from '@ab/shared';
import { emptyDraft, type BookingDraft } from '@/features/booking/draft';
import type { BookHint } from '@/features/booking/hint';
import { t } from '@/lib/i18n';

// «أيام الحلقات» (owner 2026-10-18, R-ASST-01): the booking wizard's draft for the course of a
// subscription she sold. Student, package, length, zone, program and teacher preference come from
// GET /sales/booking/course; she picks the teacher and one time per day. Pure.

/** A custom lesson count books under the package of the same size when there is one (the API accepts any). */
const packageOf = (sub: Pick<CourseSubscription, 'package' | 'lessons_total'>): PackageSize =>
  sub.package ?? PACKAGE_SIZES.find((p) => p === String(sub.lessons_total)) ?? '8';

/** The wizard's starting draft; null while she can't book it herself (blocked, or nothing to follow). */
export function courseDraft(view: SalesCourseView): BookingDraft | null {
  const { student, subscription: sub, perWeek } = view;
  if (view.blocked || !sub || perWeek === null) return null;
  return {
    ...emptyDraft({ kind: 'package' }),
    students: [{ id: student.id, name: student.name, code: student.code }],
    tz: student.tz,
    program: student.program,
    genderPref: student.teacher_gender_pref,
    durationMin: sub.duration,
    pkg: packageOf(sub),
    course: { perWeek, lessonsTotal: sub.lessons_total },
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
