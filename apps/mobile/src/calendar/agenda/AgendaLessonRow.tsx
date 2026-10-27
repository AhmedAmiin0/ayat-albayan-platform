import { lessonStatusStyle, type LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { t } from '@/core/lib/i18n/i18n';
import { LiveBadge } from '@/live/LiveBadge';
import { type, useTheme } from '@/theme';
import { durationLabel, riyadhTime, studentNames } from '@/today/lib/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { teacherClock } from './agenda';
import { RowDefaultActions } from './RowDefaultActions';
import { Tag } from './Tag';

interface AgendaLessonRowProps {
  lesson: LessonView;
  /** «غيّر الميعاد» on the row; opens the reschedule sheet. */
  onReschedule: (lesson: LessonView) => void;
  /** The row's own actions (تأكيد / إلغاء / غيّر الميعاد) in place of «غيّر الميعاد» alone. */
  actions?: ReactNode;
  /** «عدّل الوقت» (R-SCH-11), the secondary button before the ghost «غيّر الميعاد»: shown when the lesson allows it (time_edit_mode). */
  onEditTime?: (lesson: LessonView) => void;
  /** A tap on the row's line (not its buttons) opens «تفاصيل الحلقة». */
  onOpen?: (lesson: LessonView) => void;
}

/**
 * One lesson in the agenda: the Riyadh start, the students, «45 دقيقة · عند المعلم/ة 15:00 بتوقيت
 * القاهرة», the status chip (and «تجريبية» for a trial), and «غيّر الميعاد» always in view under the
 * line when it can still move (docs/07 §6: row actions are visible, never behind a tap a new admin
 * would not guess). The line itself is a 44pt button to «تفاصيل الحلقة»; the actions sit outside
 * it, so each press stays its own and a screen reader still reaches every button.
 */
export function AgendaLessonRow({ lesson, onReschedule, actions, onEditTime, onOpen }: AgendaLessonRowProps) {
  const { color } = useTheme();
  const subtitle = [durationLabel(lesson), teacherClock(lesson)].filter(Boolean).join(' · ');
  const body = { fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  const who = studentNames(lesson);
  const lineStyle = { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, minHeight: 44 };
  const line = (
    <>
      <AppText style={{ ...body, width: 48, fontVariant: ['tabular-nums'] }}>{riyadhTime(lesson.starts_at)}</AppText>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2} style={body}>
          {who}
        </AppText>
        {subtitle ? <AppText style={{ ...small, color: color.ink2, fontVariant: ['tabular-nums'] }}>{subtitle}</AppText> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <LiveBadge lesson={lesson} />
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
        {lesson.trial ? <Tag>{t.schedule.trialTag}</Tag> : null}
        {lesson.makeup ? <Tag>{t.booking.makeup.tag}</Tag> : null}
      </View>
    </>
  );
  return (
    <View style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.lessons.sheet.openRow.replace('{names}', who)}
          accessibilityHint={`${riyadhTime(lesson.starts_at)} · ${t.enums.lessonStatus[lesson.status]}`}
          onPress={() => onOpen(lesson)}
          style={({ pressed }) => [lineStyle, pressed ? { backgroundColor: color.sunk } : null]}
        >
          {line}
        </Pressable>
      ) : (
        <View style={lineStyle}>{line}</View>
      )}
      <View style={{ gap: 2, paddingStart: 58 }}>
        {actions ?? <RowDefaultActions lesson={lesson} onReschedule={onReschedule} onEditTime={onEditTime} />}
        <JoinClassroomButton lesson={lesson} />
      </View>
    </View>
  );
}
