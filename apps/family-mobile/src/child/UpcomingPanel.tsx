import { nextLesson } from '@ab/client-core';
import type { PortalLessons, PortalStudent } from '@ab/shared';
import { EmptyState, t, useNow } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { NextLessonCard, PrepareCard, UpcomingList } from '#/lessons/index.ts';
import { useChildLessons } from '#/portal/index.ts';

interface UpcomingProps {
  student: PortalStudent;
  /** A student's own page (their own words). */
  own: boolean;
}

function Upcoming({ lessons, student, own }: UpcomingProps & { lessons: PortalLessons }) {
  const now = useNow();
  const next = nextLesson(lessons.lessons, now);
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

/** «القادمة» (canvas Child): the next lesson with its join, «استعد للحلقة», the later lessons. */
export function UpcomingPanel({ student, own }: UpcomingProps) {
  const lessons = useChildLessons(student.id);
  return (
    <LoadState query={lessons}>
      {(data) => <Upcoming lessons={data} student={student} own={own} />}
    </LoadState>
  );
}
