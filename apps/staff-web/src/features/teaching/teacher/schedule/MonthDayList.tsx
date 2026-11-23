import type { LessonView } from '@ab/shared';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { TeacherLessonRow } from '@/features/teaching/teacher/lessons/TeacherLessonRow';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface MonthDayListProps {
  day: string;
  lessons: readonly LessonView[];
  tz: string;
  onOpen: (lessonId: string) => void;
  onDone: (message: string) => void;
}

const weekday: Record<string, string> = t.enums.weekday;
const dayTitle = (day: string) =>
  `${weekday[String(new Date(`${day}T12:00:00Z`).getUTCDay())] ?? ''} ${dayMonthLabel(day)}`;

export function MonthDayList({ day, lessons, tz, onOpen, onDone }: MonthDayListProps) {
  return (
    <section aria-label={dayTitle(day)} className="mt-4">
      <h2 className="border-b border-rule pb-1.5 font-display text-h4 font-bold">{dayTitle(day)}</h2>
      {lessons.length === 0 ? (
        <p className="py-3 text-sm text-ink-2">{t.teacherSchedule.noLessonsDay}</p>
      ) : (
        <ul>
          {lessons.map((lesson) => (
            <TeacherLessonRow key={lesson.id} {...{ lesson, tz, onOpen, onDone }} />
          ))}
        </ul>
      )}
    </section>
  );
}
