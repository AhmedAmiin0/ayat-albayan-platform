import { SectionHeader, t } from '@ab/web-kit';
import { NextLessonDetails } from '@/features/next-lesson';
import type { CardLessonProps } from './CardLesson.types';

/** The join button shows only while its window is open. */
export function CardLesson({ student, read }: CardLessonProps) {
  return (
    <section aria-label={t.portal.nextLesson} className="grid gap-2">
      <SectionHeader title={t.portal.nextLesson} level={3} className="min-h-0" />
      {read.next ? (
        <NextLessonDetails lesson={read.next} student={student} now={read.now} open={read.open} />
      ) : (
        <p className="text-sm text-ink-3">{t.portal.lessonsEmpty}</p>
      )}
    </section>
  );
}
