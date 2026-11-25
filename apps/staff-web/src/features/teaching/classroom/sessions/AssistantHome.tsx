import { OPEN_LESSON_STATUSES, type AssistantLessonView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, FormAlert, t, assistantLessonsQuery, localDay, useNow } from '@ab/web-kit';
import { AssistantLessonRow } from './AssistantLessonRow';

const isOpen = (l: AssistantLessonView): boolean =>
  (OPEN_LESSON_STATUSES as readonly string[]).includes(l.status);

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
