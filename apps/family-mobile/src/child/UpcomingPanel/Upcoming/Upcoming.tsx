import { EmptyState, t } from '@ab/mobile-kit';
import { NextLessonCard, PrepareCard, UpcomingList } from '@/lessons';
import type { UpcomingProps } from './Upcoming.types';
import { useUpcoming } from './use-upcoming';

export function Upcoming({ lessons, student, own }: UpcomingProps) {
  const { now, next } = useUpcoming(lessons);
  return (
    <>
      {next ? (
        <NextLessonCard lesson={next} student={student} full own={own} />
      ) : (
        <EmptyState title={t.portal.lessonsEmpty} />
      )}
      <PrepareCard lessons={lessons} student={student} full own={own} />
      <UpcomingList lessons={lessons.lessons} student={student} now={now} own={own} />
    </>
  );
}
