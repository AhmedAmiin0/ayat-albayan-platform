import type { SalesScheduleLesson } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { ScheduleLessonItem } from './ScheduleLessonItem';

interface TeacherDay {
  teacher: SalesScheduleLesson['teacher'];
  lessons: SalesScheduleLesson[];
}

/** The day's lessons by teacher (teachers by name, each teacher's lessons by start as the API sends them). */
export function byTeacher(lessons: readonly SalesScheduleLesson[]): TeacherDay[] {
  const rows = new Map<string, TeacherDay>();
  for (const lesson of lessons) {
    const row = rows.get(lesson.teacher.id) ?? { teacher: lesson.teacher, lessons: [] };
    row.lessons.push(lesson);
    rows.set(lesson.teacher.id, row);
  }
  return [...rows.values()].sort((a, b) => teacherLabel(a.teacher).localeCompare(teacherLabel(b.teacher), 'ar'));
}

/**
 * Sales' read-only day board: a row per teacher (the admin DayBoard's layout: name at the start, the
 * day's chips beside it), without the availability track, free gaps or the lesson drawer.
 */
export function SalesDayBoard({ lessons, now }: { lessons: readonly SalesScheduleLesson[]; now: Date }) {
  return (
    <section aria-label={t.schedule.dayBoard} className="border-t border-rule">
      {byTeacher(lessons).map((row) => (
        <section
          key={row.teacher.id}
          aria-label={teacherLabel(row.teacher)}
          className="grid gap-x-4 gap-y-2 border-b border-rule py-3 md:grid-cols-[184px_minmax(0,1fr)]"
        >
          <div className="grid content-start gap-0.5">
            <h2 className="font-semibold">{teacherLabel(row.teacher)}</h2>
            <span className="text-xs text-ink-3 tabular-nums">
              {t.sales.academySchedule.lessonsCount.replace('{n}', String(row.lessons.length))}
            </span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {row.lessons.map((lesson) => (
              <ScheduleLessonItem key={lesson.id} lesson={lesson} now={now} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
