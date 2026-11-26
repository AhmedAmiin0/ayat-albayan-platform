import { nextLesson, PORTAL_REFRESH_MS } from '@ab/client-core';
import type { PortalLesson, PortalLessons, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { LessonCard } from '@ab/web-kit/portal/lessons/LessonCard';
import { PrepareCard } from '@ab/web-kit/portal/lessons/PrepareCard';

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

/** Re-read every 30 seconds and when the family comes back to the page. */
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
