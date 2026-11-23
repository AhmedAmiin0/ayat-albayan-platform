import type { PortalStudent } from '@ab/shared';
import { Card, SectionHeader, QueryState } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { NextLessonDetails } from './NextLessonDetails';
import { useNextLesson } from './use-next-lesson';

const TITLE_ID = 'next-lesson-title';

interface Props {
  student: PortalStudent;
  /** A student or an adult reads their own: «حلقتك القادمة». */
  own: boolean;
}

/**
 * «الرئيسية»'s first card (owner 2026-11-19): the next lesson with its countdown, its status and
 * «ادخل الحلقة», the card's one primary; a quiet line when nothing is booked in the next 14 days.
 */
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
