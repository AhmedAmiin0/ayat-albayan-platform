import {
  counted,
  courseEndOf,
  type CourseEnd,
  type CourseEndKey,
  type TeacherCourseView,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay, localDay } from '@/core/lib/money/format';
import { fill } from '@/sales/sales';

// The course line of the teacher's student file (docs/47 owner call 1): start, end, lesson count.
// Dates and counts only, never money. Pure.

const f = () => t.teacherFile;
const on = (text: string, iso: string | undefined, tz: string) =>
  fill(text, { date: instantDay(iso ?? '', tz) });

/** One text per end key; a stop wins over an end, an end over the booked last lesson. */
const END_TEXT: Record<CourseEndKey, (end: CourseEnd, tz: string) => string> = {
  stopped: (e, tz) => on(f().courseStopped, e.at, tz),
  ended: (e, tz) => on(f().courseEnded, e.at, tz),
  expected: (e, tz) => on(f().courseExpected, e.at, tz),
  after: (e) => counted(f().courseEndsAfter, e.n ?? 0),
  unknown: () => f().courseEndUnknown,
};

/**
 * «بداية الدورة: …», the end («تنتهي الدورة بعد 3 حلقات» …, its instant on `tz`'s calendar) and
 * «الحلقات: 5 من 8». The start is a calendar date, shown with no zone shift.
 */
export function courseLines(course: TeacherCourseView, tz: string): string[] {
  const end = courseEndOf(course);
  return [
    fill(f().courseStart, { date: localDay(course.starts_on) }),
    END_TEXT[end.key](end, tz),
    fill(f().courseLessons, {
      used: String(course.lessons_used),
      total: String(course.lessons_total),
    }),
  ];
}
