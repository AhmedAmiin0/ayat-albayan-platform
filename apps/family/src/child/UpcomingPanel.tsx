import { nextLesson } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { EmptyState, ErrorState, SkeletonCard, t, useNow } from '@ab/mobile-kit';
import { NextLessonCard, PrepareCard, UpcomingList } from '@/lessons';
import { useChildLessons } from '@/portal';

/** «القادمة» (canvas Child): the next lesson with its join, «استعد للحلقة», the later lessons. */
export function UpcomingPanel({ student, own }: { student: PortalStudent; own: boolean }) {
  const now = useNow();
  const lessons = useChildLessons(student.id);
  if (!lessons.data) {
    return lessons.isError ? (
      <ErrorState onRetry={() => void lessons.refetch()} />
    ) : (
      <SkeletonCard />
    );
  }
  const next = nextLesson(lessons.data.lessons, now);
  return (
    <>
      {next ? (
        <NextLessonCard lesson={next} student={student} full own={own} />
      ) : (
        <EmptyState title={t.portal.lessonsEmpty} />
      )}
      <PrepareCard lessons={lessons.data} student={student} full own={own} />
      <UpcomingList lessons={lessons.data.lessons} student={student} now={now} own={own} />
    </>
  );
}
