import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LessonCard } from '@ab/web-kit/portal/lessons/LessonCard';
import { PrepareCard } from '@ab/web-kit/portal/lessons/PrepareCard';
import { MonthCounts } from '@ab/web-kit/portal/home/MonthCounts';
import type { CardLessonsProps } from './CardLessons.types';
import { useCardLessons } from './use-card-lessons';

export function CardLessons({ lessons, student }: CardLessonsProps) {
  const { next } = useCardLessons({ lessons });
  return (
    <>
      <section aria-label={t.portal.nextLesson} className="grid gap-2">
        <h3 className="text-sm font-semibold text-ink-2">{t.portal.nextLesson}</h3>
        {next ? (
          <LessonCard lesson={next} student={student} />
        ) : (
          <p className="text-sm text-ink-3">{t.portal.lessonsEmpty}</p>
        )}
      </section>
      <PrepareCard lessons={lessons} />
      <MonthCounts month={lessons.month} />
    </>
  );
}
