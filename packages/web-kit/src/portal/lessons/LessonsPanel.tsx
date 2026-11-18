import type { PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { LessonCard } from './LessonCard';
import { PrepareCard } from './PrepareCard';

/**
 * «القادمة»: «ما المطلوب» first, then the next 14 days, one card per lesson, re-read every 30
 * seconds and when the family comes back to the page.
 */
export function LessonsPanel({ student }: { student: PortalStudent }) {
  const query = useQuery(portalLessonsQuery(student.id));
  return (
    <LoadState query={query}>
      {(lessons) => (
        <div className="grid gap-3">
          <PrepareCard lessons={lessons} />
          {lessons.lessons.length === 0 ? (
            <EmptyState title={t.portal.lessonsEmpty}>{t.portal.lessonsEmptyHint}</EmptyState>
          ) : (
            <ul className="grid gap-3">
              {lessons.lessons.map((lesson) => (
                <li key={lesson.id} className="rounded-lg border border-rule bg-raised p-4">
                  <LessonCard lesson={lesson} student={student} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </LoadState>
  );
}
