import type { Density } from '@ab/client-core';
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
  /** An ended row in «انتهت n حلقات اليوم»: muted, its report lead only (owner 2026-11-14). */
  ended?: boolean;
  /** «صفوف مضغوطة» (owner 2026-11-14): tighter, without the students' own clocks. */
  density?: Density;
}

/** The row and its open button, and whether the students' clocks show (still a 44px target). */
const DENSITY: Record<Density, { row: string; open: string; times: boolean }> = {
  comfortable: { row: 'py-1.5', open: 'min-h-12', times: true },
  compact: { row: 'py-0.5', open: 'min-h-11', times: false },
};

/** An ended row never offers the join; its report stays (no pending block on the home). */
const endedLead = (lead: string | null) => (lead === 'report' ? lead : null);

const ROW = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule';
const OPEN =
  'flex min-w-0 flex-[1_1_16rem] items-center gap-3 rounded-md px-1 text-start ' +
  'transition-colors hover:bg-sunk';

/**
 * One compact lesson line (docs/48): time · names · «عند الطالب …» · her word · tags, a 48px button
 * that opens the drawer with every action, and ONE lead beside it, secondary except a live join.
 */
export function TeacherLessonRow(props: TeacherLessonRowProps) {
  const { lesson, tz, onOpen, onDone, ended = false } = props;
  const d = DENSITY[props.density ?? 'comfortable'];
  const clock = useClock();
  const plan = useTeacherPlan(lesson);
  const status = useLessonStatusText().chip(lesson.status);
  const word = teacherWord(lesson, { now: plan.now, status });
  const names = studentNames(lesson);
  const lead = ended ? endedLead(plan.lead) : plan.lead;
  const look = { filled: lead === 'join', size: 'md' } as const;
  return (
    <li className={cn(ROW, d.row, ended && 'text-ink-2')}>
      <button
        type="button"
        aria-label={t.lessons.sheet.openRow.replace('{names}', names)}
        onClick={() => onOpen(lesson.id)}
        className={cn(OPEN, d.open)}
      >
        <span dir={clockDir(clock)} className="shrink-0 font-semibold tabular-nums">
          {clockOf(new Date(lesson.starts_at), { tz, ...clock })}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-semibold">{names}</span>
          {d.times && studentTimes(lesson, tz, clock).map((line) => (
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
