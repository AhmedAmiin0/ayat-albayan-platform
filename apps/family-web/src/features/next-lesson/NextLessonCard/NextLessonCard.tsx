import { Card, SectionHeader, t, QueryState } from '@ab/web-kit';
import { NextLessonDetails } from '@/features/next-lesson/NextLessonDetails';
import type { Props } from './NextLessonCard.types';
import { TITLE_ID } from './next-lesson-card.helpers';
import { useNextLessonCard } from './use-next-lesson-card';

/** A quiet line when nothing is booked in the next 14 days. */
export function NextLessonCard({ student, own }: Props) {
  const { read, next, title } = useNextLessonCard({ student, own });
  return (
    <Card asChild className="grid gap-3 p-4 sm:p-5">
      <section aria-labelledby={TITLE_ID}>
        <SectionHeader title={title} id={TITLE_ID} />
        <QueryState query={read.lessons} rows={1}>
          {() =>
            next ? (
              <NextLessonDetails
                lesson={next}
                student={student}
                now={read.now}
                open={read.open}
                full
              />
            ) : (
              <p className="text-sm text-ink-3">{t.portal.lessonsEmpty}</p>
            )
          }
        </QueryState>
      </section>
    </Card>
  );
}
