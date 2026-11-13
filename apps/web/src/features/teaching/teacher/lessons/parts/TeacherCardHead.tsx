import { isOpenLesson, lessonWhenAt, type LessonView, subscriptionStatusStyle } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { LessonTags, studentNames, studentTimes } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import type { LessonStatusChip } from '@/lib/settings/lesson-status-text';
import { useClock } from '@/lib/clock';
import { CopyStudentLink } from './CopyStudentLink';

export interface TeacherCardHeadProps {
  lesson: LessonView;
  tz: string;
  word: LessonStatusChip;
  /** Room mode (owner Q3): «انسخ رابط الطالب» under «المزيد»; never beside her own link. */
  room: boolean;
}

const unpaidLabel = (lesson: LessonView, name: string) =>
  lesson.students.length > 1 ? `${name}: ${t.subscriptions.unpaidFlag}` : t.subscriptions.unpaidFlag;

/**
 * The card's head (docs/48): when, in her own zone with no «بتوقيتك» (the zone is hers), the
 * names, each student's clock, the unpaid flag (R-SUB-02), the tags and her word chip.
 */
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
