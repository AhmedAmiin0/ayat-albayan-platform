import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { AgendaLessonRow } from '@/calendar';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { StatusChip, useNow, ErrorLine } from '@ab/mobile-kit';
import type { ButtonVariant } from '@ab/mobile-kit';
import { studentClocks } from './lesson-lines';
import { teacherWord } from './teacher-word';
import { TeacherRowAction, type LeadAction } from './TeacherRowAction';
import { useTeacherPlan } from './use-teacher-plan';

interface TeacherLessonRowProps {
  lesson: LessonView;
  /** A tap on the line opens TeacherLessonSheet. */
  onOpen: (lesson: LessonView) => void;
  onReport: (lessonId: string) => void;
  onNotice: (text: string) => void;
  /** An ended row in the fold: the word and only its report lead (owner 2026-11-14). */
  quiet?: boolean;
  /** Compact rows drop the students' clocks line. */
  compact?: boolean;
}

const CHIP_MAX = 140;

/** No move on a teacher's row (the API never offers her `reschedule`). */
const noMove = () => undefined;

/** Outlined on a row except the live join, never many filled buttons on one day (docs/48). */
const rowVariant = (lead: LeadAction, live: boolean): ButtonVariant =>
  lead === 'join' && live ? 'primary' : 'secondary';

/** The leads a row may draw: an ended row keeps only its report (no due block, 2026-11-14). */
const OPEN_LEADS: readonly LeadAction[] = ['join', 'confirm', 'report'];
const QUIET_LEADS: readonly LeadAction[] = ['report'];
const rowLead = (lead: string | null, quiet = false): LeadAction | undefined =>
  (quiet ? QUIET_LEADS : OPEN_LEADS).find((a) => a === lead);

/** One lead action per row (docs/48), never JoinAround's join, which stays live 2 h past end. */
export function TeacherLessonRow(p: TeacherLessonRowProps) {
  const { lesson } = p;
  const now = useNow();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const { plan, join, ctx } = useTeacherPlan(lesson, p);
  const word = teacherWord(lesson, now);
  const lead = rowLead(plan.lead, p.quiet);
  const actions = lead ? (
    <View style={{ gap: 4 }}>
      <TeacherRowAction action={lead} variant={rowVariant(lead, join === 'live')} ctx={ctx} />
      {ctx.acts.error ? <ErrorLine message={ctx.acts.error} /> : null}
    </View>
  ) : null;
  return (
    <AgendaLessonRow
      lesson={lesson}
      onReschedule={noMove}
      onOpen={p.onOpen}
      meta={p.compact ? '' : studentClocks(lesson, { tz, cycle })}
      word={word?.label}
      chip={
        // Capped so a long word never squeezes the names at 390 pt.
        <View style={{ maxWidth: CHIP_MAX }}>
          {word ? (
            <StatusChip tone={word.tone} glyph={word.glyph} label={word.label} size="sm" />
          ) : (
            <LessonStatusChip status={lesson.status} size="sm" />
          )}
        </View>
      }
      join={false}
      actions={actions}
    />
  );
}
