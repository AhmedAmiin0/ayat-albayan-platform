import type { AssistantLessonView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { EnterButton } from './JoinButton';

const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** One session of the assistant's list (AssistantHome, and sales' running lessons): time, students, teacher, «ادخل الحلقة». */
export function AssistantLessonRow({ lesson }: { lesson: AssistantLessonView }) {
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
