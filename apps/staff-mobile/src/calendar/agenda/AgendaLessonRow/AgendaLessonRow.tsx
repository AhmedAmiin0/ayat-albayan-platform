import type { LessonView } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { JoinAround } from '@/classroom';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, type, useTheme, AppText, useInset } from '@ab/mobile-kit';
import { durationLabel, lessonClock, studentNames } from '@/today';
import { teacherClock } from '@/calendar/agenda/agenda';
import { RowDefaultActions } from '@/calendar/agenda/RowDefaultActions';
import { RowSide } from '@/calendar/agenda/RowSide';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';

const lessonMeta = (lesson: LessonView, cycle: ClockCycle, tz: string): string =>
  [durationLabel(lesson), teacherClock(lesson, cycle, tz)].filter(Boolean).join(' · ');

const lineStyle = { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 } as const;

interface AgendaLessonRowProps {
  lesson: LessonView;
  onReschedule: (lesson: LessonView) => void;
  actions?: ReactNode;
  /** R-SCH-11: shown when the lesson allows it (time_edit_mode). */
  onEditTime?: (lesson: LessonView) => void;
  /** A tap on the row's line, not its buttons, opens the lesson details. */
  onOpen?: (lesson: LessonView) => void;
  /** Replaces the default second line; the teacher's view shows students' clocks. */
  meta?: string;
  /** The chip in place of the lesson-status chip (the teacher's own word, docs/48). */
  chip?: ReactNode;
  /**
   * false: no JoinAround and no default actions; the row shows `actions` alone (the teacher draws
   * her own lead, docs/48). Default true, as before.
   */
  join?: boolean;
  /** The word a screen reader hears after the time, in place of the status (her word, docs/48). */
  word?: string;
}

/** JoinAround the actions or the defaults (as before), or the actions alone (`join` false). */
function RowFoot({ lesson, actions, onReschedule, onEditTime, join = true }: AgendaLessonRowProps) {
  if (!join) return actions ?? null;
  const own = actions ?? (
    <RowDefaultActions lesson={lesson} onReschedule={onReschedule} onEditTime={onEditTime} />
  );
  return <JoinAround lesson={lesson}>{own}</JoinAround>;
}

/** docs/07 §6: row actions stay visible, outside the 44pt line button so each press is its own. */
export function AgendaLessonRow(props: AgendaLessonRowProps) {
  const { lesson, onOpen, meta, chip, word } = props;
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const frame = useInset() ? { paddingHorizontal: 16 } : { borderBottomWidth: 1, borderBottomColor: color.rule };
  const subtitle = meta ?? lessonMeta(lesson, cycle, tz);
  const body = { fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  const who = studentNames(lesson);
  const status = useLessonStatusText();
  const hint = `${lessonClock(lesson.starts_at, tz, cycle)} · ${word ?? status.label(lesson.status)}`;
  const line = (
    <>
      <AppText style={{ ...body, width: cycle === '12' ? 72 : 48, fontVariant: ['tabular-nums'] }}>{lessonClock(lesson.starts_at, tz, cycle)}</AppText>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2} style={body}>
          {who}
        </AppText>
        {subtitle ? <AppText style={{ ...small, color: color.ink2, fontVariant: ['tabular-nums'] }}>{subtitle}</AppText> : null}
      </View>
      <RowSide lesson={lesson} chip={chip} />
    </>
  );
  return (
    <View style={{ gap: 6, paddingVertical: 10, ...frame }}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.lessons.sheet.openRow.replace('{names}', who)}
          accessibilityHint={hint}
          onPress={() => onOpen(lesson)}
          style={({ pressed }) => [lineStyle, pressed ? { backgroundColor: color.sunk } : null]}
        >
          {line}
        </Pressable>
      ) : (
        <View style={lineStyle}>{line}</View>
      )}
      <View style={{ gap: 8 }}>
        <RowFoot {...props} />
      </View>
    </View>
  );
}
