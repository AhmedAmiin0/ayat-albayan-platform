import {
  counted,
  courseEndOf,
  zonedPartsIn,
  type CourseEnd,
  type CourseEndKey,
  type TeacherCourseView,
} from '@ab/shared';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

// What «ملف الطالب» says about the course (docs/47 owner call 1): its start, how it ends, and the
// lessons used. Dates only, never money; the word is «الدورة», never «الباقة».

const f = t.teacherFile;
const fill = (text: string, date: string): string => text.replace('{date}', date);

/** An instant's calendar day in the viewer's zone, «3 أكتوبر 2026». */
const dayIn = (iso: string, tz: string): string => dateLabel(zonedPartsIn(new Date(iso), tz).date);

const END_TEXT: Record<CourseEndKey, (end: CourseEnd, tz: string) => string> = {
  stopped: (e, tz) => fill(f.courseStopped, dayIn(e.at ?? '', tz)),
  ended: (e, tz) => fill(f.courseEnded, dayIn(e.at ?? '', tz)),
  expected: (e, tz) => fill(f.courseExpected, dayIn(e.at ?? '', tz)),
  after: (e) => counted(f.courseEndsAfter, e.n ?? 0),
  unknown: () => f.courseEndUnknown,
};

export interface CourseLines {
  start: string;
  end: string;
  lessons: string;
}

/** The three facts of the course line. `starts_on` is a calendar date: no zone shift. */
export function courseLines(course: TeacherCourseView, tz: string): CourseLines {
  const end = courseEndOf(course);
  return {
    start: fill(f.courseStart, dateLabel(course.starts_on)),
    end: END_TEXT[end.key](end, tz),
    lessons: f.courseLessons
      .replace('{used}', String(course.lessons_used))
      .replace('{total}', String(course.lessons_total)),
  };
}
