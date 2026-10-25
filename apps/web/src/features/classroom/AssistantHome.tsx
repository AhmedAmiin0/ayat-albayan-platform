import { OPEN_LESSON_STATUSES, type AssistantLessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { assistantLessonsQuery, localDay } from './api';
import { AssistantLessonRow } from './AssistantLessonRow';
import { useNow } from './use-now';

const isOpen = (l: AssistantLessonView): boolean => (OPEN_LESSON_STATUSES as readonly string[]).includes(l.status);

/** The assistant's whole app: today's sessions of their students, each with «ادخل الحلقة». */
export function AssistantHome() {
  const now = useNow(3_600_000);
  const day = localDay(now);
  const lessons = useQuery(assistantLessonsQuery(day));
  if (lessons.isPending) return <p className="text-ink-3">{t.common.loading}</p>;
  if (lessons.isError) return <FormAlert>{t.common.error}</FormAlert>;
  const open = lessons.data.filter(isOpen);
  if (open.length === 0) return <EmptyState title={t.classroom.assistants.homeEmpty} />;
  return (
    <section aria-label={t.classroom.assistants.homeTitle}>
      <h2 className="mb-2 font-display text-h3 font-bold">{t.classroom.assistants.homeTitle}</h2>
      <ul>
        {open.map((l) => (
          <AssistantLessonRow key={l.lesson_id} lesson={l} />
        ))}
      </ul>
    </section>
  );
}
