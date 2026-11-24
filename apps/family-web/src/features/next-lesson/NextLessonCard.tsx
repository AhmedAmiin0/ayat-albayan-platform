import type { PortalStudent } from '@ab/shared';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { SectionHeader } from '@ab/web-kit/components/ui/surface/section-header';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { NextLessonDetails } from './NextLessonDetails';
import { useNextLesson } from './use-next-lesson';

const TITLE_ID = 'next-lesson-title';

interface Props {
  student: PortalStudent;
  /** A student or an adult reads their own wording. */
  own: boolean;
}

/** A quiet line when nothing is booked in the next 14 days. */
export function NextLessonCard({ student, own }: Props) {
  const read = useNextLesson(student.id);
  const { next } = read;
  const title = own ? t.portal.app.lesson.nextLessonSelf : t.portal.nextLesson;
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
