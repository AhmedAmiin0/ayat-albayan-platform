import { subscriptionStatusStyle, type Tone } from '@ab/money';
import type { LessonView } from '@ab/schedule';
import { clockOf } from '@ab/time';
import {
  NuqtaGlyph,
  tzCity,
  t,
  teacherLabel,
  cn,
  zoneLabel,
  useClock,
  useViewerTz,
  clockDir,
  useLessonStatusText,
} from '@ab/web-kit';
import { studentNames } from './lessons';
import { LessonTags } from './LessonTags';

// Literal class strings so Tailwind's scanner sees them (docs/07 §6 status chip tones).
const EDGE: Record<Tone, string> = {
  ok: 'border-s-ok',
  act: 'border-s-act',
  bad: 'border-s-danger',
  neutral: 'border-s-rule-strong',
};
const INK: Record<Tone, string> = { ok: 'text-ok', act: 'text-act', bad: 'text-danger', neutral: 'text-ink-3' };
const unpaid = subscriptionStatusStyle.unpaid;

/**
 * What a chip reads: the admin's LessonView, or a narrower read-only lesson (sales' schedule, which
 * never carries flags, proposals or the student's zone).
 */
export type ChipLesson = Pick<LessonView, 'id' | 'starts_at' | 'status' | 'trial' | 'makeup' | 'time_edit'> & {
  teacher: { display_name_ar: string; display_name_en?: string | null };
  students: readonly { name: string; tz?: string; unpaid?: boolean }[];
  conflicts?: readonly unknown[];
  pending_proposal?: unknown;
};

export interface LessonChipProps<L extends ChipLesson> {
  lesson: L;
  /** Opens the lesson drawer; absent = read-only (a plain block, no button). */
  onOpen?: ((lesson: L) => void) | undefined;
  /** Hide the teacher line (the row already names the teacher). */
  hideTeacher?: boolean;
}

/** A day's chips under each other (the week grid's cell, the phone agenda's teacher row). */
export function LessonChipList({
  lessons,
  onOpen,
}: {
  lessons: readonly LessonView[];
  onOpen: (lesson: LessonView) => void;
}) {
  return (
    <ul className="grid gap-1">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <LessonChip lesson={lesson} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

/** Shape carries state, colour only confirms; flags clashes (R-SCH-04) and unpaid (R-SUB-02). */
export function LessonChip<L extends ChipLesson>({
  lesson,
  onOpen,
  hideTeacher = true,
}: LessonChipProps<L>) {
  const style = useLessonStatusText().chip(lesson.status);
  const viewer = useViewerTz();
  const tz = lesson.students[0]?.tz ?? viewer;
  const clock = useClock();
  const local = zoneLabel(lesson.starts_at, { tz, base: viewer }, clock);
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      {...(onOpen ? { type: 'button' as const, onClick: () => onOpen(lesson) } : {})}
      className={cn(
        'grid w-full min-w-0 gap-0.5 overflow-hidden rounded-sm border border-rule border-s-[3px] bg-raised px-2 py-1.5 text-start text-xs',
        onOpen && 'transition-colors duration-[120ms] hover:bg-sunk',
        EDGE[style.tone],
      )}
    >
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span dir={clockDir(clock)} className="font-semibold tabular-nums">
          {clockOf(new Date(lesson.starts_at), { ...clock, tz: viewer })}
        </span>
        <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{studentNames(lesson)}</span>
      </span>
      {!hideTeacher && <span className="text-ink-3 [overflow-wrap:anywhere]">{teacherLabel(lesson.teacher)}</span>}
      <span className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5', INK[style.tone])}>
        <span className="flex min-w-0 items-center gap-1">
          <NuqtaGlyph shape={style.glyph} />
          <span className="min-w-0">{style.label}</span>
        </span>
        <LessonTags lesson={lesson} />
      </span>
      {local && (
        <span className="text-2xs text-ink-3">
          {t.schedule.studentTime.replace('{time}', t.schedule.inCity.replace('{time}', local).replace('{city}', tzCity(tz) ?? tz))}
        </span>
      )}
      {(lesson.conflicts?.length ?? 0) > 0 && (
        <span className="flex items-center gap-1 text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{t.schedule.needsReview}</span>
        </span>
      )}
      {lesson.students.some((s) => s.unpaid) && (
        <span className={cn('flex items-center gap-1', INK[unpaid.tone])}>
          <NuqtaGlyph shape={unpaid.glyph} />
          <span>{t.subscriptions.unpaidFlag}</span>
        </span>
      )}
      {Boolean(lesson.pending_proposal) && (
        <span className="flex items-center gap-1 text-act">
          <NuqtaGlyph shape="half" />
          <span>{t.schedule.hasProposal}</span>
        </span>
      )}
    </Tag>
  );
}
