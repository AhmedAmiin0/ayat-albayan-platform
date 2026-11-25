import { courseEndOf, type CourseEnd, type CourseEndKey, type TeacherCourseView } from '@ab/shared';
import { counted } from '@ab/core';
import { zonedPartsIn } from '@ab/time';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit';

// Course wording (docs/47): dates only, never money; it says course, never package.

const f = t.teacherFile;
const fill = (text: string, date: string): string => text.replace('{date}', date);

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
