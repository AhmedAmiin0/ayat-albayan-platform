import { Dot, t, LessonCountdown } from '@ab/web-kit';
import type { Shown } from '@/features/next-lesson/NextLessonDetails/NextLessonDetails.types';

export function ClockLines({ lesson, now, open, full }: Shown) {
  return (
    <>
      {full && <LessonCountdown lesson={lesson} now={now} />}
      {open && (
        <Dot tone="ok" live>
          {t.portal.app.lesson.openNow}
        </Dot>
      )}
    </>
  );
}
