import { clockOf, lessonStatusStyle, type LessonView, subscriptionStatusStyle, type Tone } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { cn } from '@/lib/utils';
import { studentNames } from './lessons';
import { LessonTags } from './LessonTags';
import { zoneLabel } from '@/features/teaching/schedule/reschedule/slots';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';
import { clockDir } from '@/lib/clock-text';

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
export function LessonChipList({ lessons, onOpen }: { lessons: readonly LessonView[]; onOpen: (lesson: LessonView) => void }) {
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

/**
 * One lesson in the week grid (R-SCH-01, R-SCH-03): the viewer's time · student(s), the status as
 * nuqta + word (shape carries state, colour only confirms), the student's own clock when it
 * differs, and
 * a flag for a generated lesson that clashes (R-SCH-04), a student whose package is unpaid with
 * nothing left (R-SUB-02) or a teacher's pending proposal (R-SCH-08). A trial says «تجريبية», a
 * makeup (R-SCH-10) «تعويضية».
 */
export function LessonChip<L extends ChipLesson>({ lesson, onOpen, hideTeacher = true }: LessonChipProps<L>) {
  const style = lessonStatusStyle[lesson.status];
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
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span dir={clockDir(clock)} className="font-semibold tabular-nums">
          {clockOf(new Date(lesson.starts_at), { ...clock, tz: viewer })}
        </span>
        <span className="truncate font-medium">{studentNames(lesson)}</span>
      </span>
      {!hideTeacher && <span className="truncate text-ink-3">{teacherLabel(lesson.teacher)}</span>}
      <span className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5', INK[style.tone])}>
        <span className="flex min-w-0 items-center gap-1">
          <NuqtaGlyph shape={style.glyph} />
          <span className="truncate">{t.enums.lessonStatus[lesson.status]}</span>
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
