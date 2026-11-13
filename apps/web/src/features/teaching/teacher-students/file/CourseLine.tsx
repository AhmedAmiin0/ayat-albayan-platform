import type { TeacherCourseView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { courseLines } from './course-text';

export interface CourseLineProps {
  course: TeacherCourseView | null;
  /** The viewer's zone, for the stop / end / booked-last-lesson days. */
  tz: string;
}

/**
 * The course in one wrapping line (docs/47): its start, how it ends («تنتهي الدورة بعد 3 حلقات»
 * or a day) and «الحلقات: 5 من 8», then the hint that the count covers every teacher.
 */
export function CourseLine({ course, tz }: CourseLineProps) {
  if (!course) return <p className="mb-4 text-sm text-ink-3">{t.teacherFile.noCourse}</p>;
  const lines = courseLines(course, tz);
  return (
    <section aria-label={t.teacherFile.title} className="mb-4 grid gap-1">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        <li>{lines.start}</li>
        <li className="font-semibold text-ink">{lines.end}</li>
        <li className="tabular-nums">{lines.lessons}</li>
      </ul>
      <p className="text-xs text-ink-3">{t.teacherFile.courseHint}</p>
    </section>
  );
}
