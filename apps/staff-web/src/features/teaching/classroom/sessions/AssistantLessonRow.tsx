import { clockOf, type AssistantLessonView } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { useClock } from '@ab/web-kit/lib/clock';
import { clockDir, viewerZone } from '@ab/web-kit/lib/clock-text';

/** Shared by AssistantHome and sales' running lessons. */
export function AssistantLessonRow({ lesson }: { lesson: AssistantLessonView }) {
  const names = lesson.student_names.join(t.common.listSeparator);
  const clock = { ...useClock(), tz: viewerZone() };
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule py-4">
      <span dir={clockDir(clock)} className="text-lg font-semibold tabular-nums">{clockOf(new Date(lesson.starts_at), clock)}</span>
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
