import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { AgendaLessonRow } from '@/calendar';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { useNow } from '@/core/lib/time/use-now';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { ButtonVariant } from '@/core/ui/primitives/Button';
import { studentClocks } from './lesson-lines';
import { teacherWord } from './teacher-word';
import { TeacherRowAction, type LeadAction } from './TeacherRowAction';
import { useTeacherPlan } from './use-teacher-plan';

interface TeacherLessonRowProps {
  lesson: LessonView;
  /** A tap on the line opens TeacherLessonSheet. */
  onOpen: (lesson: LessonView) => void;
  onReport: (lessonId: string) => void;
  /** Says what landed («سأحضر»). */
  onNotice: (text: string) => void;
  /** An ended row in the fold: the word only, no lead (docs/48). */
  quiet?: boolean;
}

const CHIP_MAX = 140;

/** No move on a teacher's row (the API never offers her `reschedule`). */
const noMove = () => undefined;

/** Outlined on a row, except the live join (docs/48: never five filled «سأحضر» on one day). */
const rowVariant = (lead: LeadAction, live: boolean): ButtonVariant =>
  lead === 'join' && live ? 'primary' : 'secondary';

/** A row never leads with the report: a due report lives only in the due block (docs/48). */
const isLead = (lead: string | null): lead is Exclude<LeadAction, 'report'> =>
  lead === 'join' || lead === 'confirm';

/**
 * One of her lessons as a compact row (docs/48): time · names · «عند الطالب 15:00» · her word
 * (teacher-word) and ONE lead (lessonPlan) drawn by TeacherRowAction, never JoinAround's join,
 * which stays live two hours past the end. The line opens the sheet with every action.
 */
export function TeacherLessonRow(p: TeacherLessonRowProps) {
  const { lesson } = p;
  const now = useNow();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const { plan, join, ctx } = useTeacherPlan(lesson, p);
  const word = teacherWord(lesson, now);
  const lead = p.quiet ? null : plan.lead;
  const actions = isLead(lead) ? (
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
      meta={studentClocks(lesson, { tz, cycle })}
      word={word?.label}
      chip={
        // Capped so a long word («سيُرسل إلى الأسرة بعد …») never squeezes the names at 390 pt.
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
