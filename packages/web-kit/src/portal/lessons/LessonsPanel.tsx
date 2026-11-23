import { nextLesson, PORTAL_REFRESH_MS } from '@ab/client-core';
import type { PortalLesson, PortalLessons, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, QueryState, Card } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { useNow } from '#/lib/time/index.ts';
import { portalLessonsQuery } from '#/portal/api.ts';
import { LessonCard } from './LessonCard';
import { PrepareCard } from './PrepareCard';

interface Props {
  student: PortalStudent;
  /** The page shows the next lesson above the tabs already (the family home): not twice. */
  exceptNext?: boolean;
}

interface ListProps {
  lessons: PortalLessons;
  student: PortalStudent;
  skip: PortalLesson | null;
}

/** Only the next lesson, and it is shown above: one quiet line, not an empty box. */
const NoMore = () => <p className="text-sm text-ink-3">{t.portal.app.home.noMore}</p>;

const Empty = () => (
  <EmptyState title={t.portal.lessonsEmpty}>{t.portal.lessonsEmptyHint}</EmptyState>
);

function Lessons({ lessons, student, skip }: ListProps) {
  const shown = lessons.lessons.filter((lesson) => lesson.id !== skip?.id);
  const None = skip ? NoMore : Empty;
  return (
    <div className="grid gap-3">
      <PrepareCard lessons={lessons} />
      {shown.length === 0 ? (
        <None />
      ) : (
        <ul className="grid gap-3">
          {shown.map((lesson) => (
            <Card asChild key={lesson.id} className="p-4">
              <li>
                <LessonCard lesson={lesson} student={student} />
              </li>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * «القادمة»: «ما المطلوب» first, then the next 14 days, one card per lesson, re-read every 30
 * seconds and when the family comes back to the page.
 */
export function LessonsPanel({ student, exceptNext = false }: Props) {
  const query = useQuery(portalLessonsQuery(student.id));
  const now = useNow(PORTAL_REFRESH_MS);
  return (
    <QueryState query={query}>
      {(read) => (
        <Lessons
          lessons={read}
          student={student}
          skip={exceptNext ? nextLesson(read.lessons, now) : null}
        />
      )}
    </QueryState>
  );
}
