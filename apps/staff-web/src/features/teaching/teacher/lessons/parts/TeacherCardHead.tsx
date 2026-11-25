import { lessonWhenAt } from '@ab/shared';
import { subscriptionStatusStyle } from '@ab/money';
import { isOpenLesson, type LessonView } from '@ab/schedule';
import { StatusChip, t, useClock } from '@ab/web-kit';
import { LessonTags, studentNames, studentTimes } from '@/features/teaching/schedule';
import type { LessonStatusChip } from '@ab/web-kit';
import { CopyStudentLink } from './CopyStudentLink';

export interface TeacherCardHeadProps {
  lesson: LessonView;
  tz: string;
  word: LessonStatusChip;
  /** Room mode: the copy-student-link action sits under "More", never beside her own link. */
  room: boolean;
}

const unpaidLabel = (lesson: LessonView, name: string) =>
  lesson.students.length > 1 ? `${name}: ${t.subscriptions.unpaidFlag}` : t.subscriptions.unpaidFlag;

/** Times show in her own zone with no zone suffix, since the zone is hers (docs/48). */
export function TeacherCardHead({ lesson, tz, word, room }: TeacherCardHeadProps) {
  const clock = useClock();
  return (
    <div className="flex items-start gap-x-3 gap-y-2">
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="text-lg font-semibold tabular-nums">
          {lessonWhenAt(new Date(lesson.starts_at), { tz, ...clock })}
        </p>
        <p className="text-body font-semibold">{studentNames(lesson)}</p>
        {studentTimes(lesson, tz, clock).map((line) => (
          <p key={line} className="text-xs text-ink-2">{line}</p>
        ))}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip {...word} />
          <LessonTags lesson={lesson} />
          {lesson.students.filter((s) => s.unpaid).map((s) => (
            <StatusChip
              key={s.id}
              {...subscriptionStatusStyle.unpaid}
              size="sm"
              label={unpaidLabel(lesson, s.name)}
            />
          ))}
        </div>
      </div>
      {room && isOpenLesson(lesson.status) && <CopyStudentLink lessonId={lesson.id} />}
    </div>
  );
}
