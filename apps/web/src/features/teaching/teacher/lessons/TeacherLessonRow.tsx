import { clockOf, type LessonView, subscriptionStatusStyle } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { LessonTags, studentNames, studentTimes } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { clockDir } from '@/lib/clock-text';
import { useLessonStatusText } from '@/lib/settings/lesson-status-text';
import { cn } from '@/lib/utils';
import { TeacherLessonLead } from './parts/TeacherLessonLead';
import { teacherWord } from './parts/teacher-word';
import { useTeacherPlan } from './parts/use-teacher-plan';

export interface TeacherLessonRowProps {
  lesson: LessonView;
  /** The teacher's zone. */
  tz: string;
  onOpen: (lessonId: string) => void;
  onDone: (message: string) => void;
  /** An ended row in «انتهت n حلقات اليوم»: muted, no lead (its report waits in the block). */
  ended?: boolean;
}

const ROW = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-1.5';
const OPEN =
  'flex min-h-12 min-w-0 flex-[1_1_16rem] items-center gap-3 rounded-md px-1 text-start ' +
  'transition-colors hover:bg-sunk';

/**
 * One compact lesson line (docs/48): time · names · «عند الطالب …» · her word · tags, a 48px button
 * that opens the drawer with every action, and ONE lead beside it, secondary except a live join.
 */
export function TeacherLessonRow(props: TeacherLessonRowProps) {
  const { lesson, tz, onOpen, onDone, ended = false } = props;
  const clock = useClock();
  const plan = useTeacherPlan(lesson);
  const status = useLessonStatusText().chip(lesson.status);
  const word = teacherWord(lesson, { now: plan.now, status });
  const names = studentNames(lesson);
  const lead = ended ? null : plan.lead;
  const look = { filled: lead === 'join', size: 'md' } as const;
  return (
    <li className={cn(ROW, ended && 'text-ink-2')}>
      <button
        type="button"
        aria-label={t.lessons.sheet.openRow.replace('{names}', names)}
        onClick={() => onOpen(lesson.id)}
        className={OPEN}
      >
        <span dir={clockDir(clock)} className="shrink-0 font-semibold tabular-nums">
          {clockOf(new Date(lesson.starts_at), { tz, ...clock })}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-semibold">{names}</span>
          {studentTimes(lesson, tz, clock).map((line) => (
            <span key={line} className="text-xs text-ink-2">{line}</span>
          ))}
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusChip {...word} size="sm" />
            <LessonTags lesson={lesson} />
            {lesson.students.some((s) => s.unpaid) && (
              <StatusChip {...subscriptionStatusStyle.unpaid} size="sm" label={t.subscriptions.unpaidFlag} />
            )}
          </span>
        </span>
      </button>
      {lead && (
        <div className="grid shrink-0 gap-1 max-sm:w-full">
          <TeacherLessonLead {...{ action: lead, lesson, plan, look, onDone }} />
        </div>
      )}
    </li>
  );
}
