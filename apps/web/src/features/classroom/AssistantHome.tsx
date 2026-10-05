import { OPEN_LESSON_STATUSES, type AssistantLessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { assistantLessonsQuery, localDay } from './api';
import { EnterButton } from './JoinButton';
import { useNow } from './use-now';

const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const isOpen = (l: AssistantLessonView): boolean => (OPEN_LESSON_STATUSES as readonly string[]).includes(l.status);

function Row({ lesson }: { lesson: AssistantLessonView }) {
  const names = lesson.student_names.join(t.common.listSeparator);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule py-4">
      <span dir="ltr" className="text-lg font-semibold tabular-nums">{CLOCK.format(new Date(lesson.starts_at))}</span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-body font-semibold">
          <span className="text-xs font-normal text-ink-3">{t.classroom.assistants.student} </span>
          {names}
        </p>
        <p className="text-xs text-ink-2">
          {t.classroom.assistants.teacher} {lesson.teacher_name}
        </p>
      </div>
      <EnterButton lesson={{ id: lesson.lesson_id, starts_at: lesson.starts_at, ends_at: lesson.ends_at }} size="lg" />
    </li>
  );
}

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
          <Row key={l.lesson_id} lesson={l} />
        ))}
      </ul>
    </section>
  );
}
