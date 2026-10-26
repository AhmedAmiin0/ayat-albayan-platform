import { applyLessonEvent, lessonStatusStyle, type LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { EditTimeButton } from '@/edit-time/components/EditTimeButton';
import { editMode } from '@/edit-time/lib/types';
import { t } from '@/core/lib/i18n/i18n';
import { LiveBadge } from '@/live/LiveBadge';
import { type, useTheme } from '@/theme';
import { durationLabel, riyadhTime, studentNames } from '@/today/lib/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { teacherClock } from './agenda';
import { Tag } from './Tag';

export interface AgendaLessonRowProps {
  lesson: LessonView;
  /** «غيّر الميعاد» on the row; opens the reschedule sheet. */
  onReschedule: (lesson: LessonView) => void;
  /** The row's own actions (تأكيد / إلغاء / غيّر الميعاد) in place of «غيّر الميعاد» alone. */
  actions?: ReactNode;
  /** «عدّل الوقت» (R-SCH-11), the secondary button before the ghost «غيّر الميعاد»: shown when the lesson allows it (time_edit_mode). */
  onEditTime?: (lesson: LessonView) => void;
}

/** The API offered the move and the shared state machine allows it from this status. */
export function canReschedule(lesson: LessonView): boolean {
  return lesson.allowed_events.includes('reschedule') && applyLessonEvent(lesson.status, 'reschedule') !== null;
}

/**
 * One lesson in the agenda: the Riyadh start, the students, «45 دقيقة · عند المعلم/ة 15:00 بتوقيت
 * القاهرة», the status chip (and «تجريبية» for a trial), and «غيّر الميعاد» always in view under the
 * line when it can still move (docs/07 §6: row actions are visible, never behind a tap a new admin
 * would not guess).
 */
export function AgendaLessonRow({ lesson, onReschedule, actions, onEditTime }: AgendaLessonRowProps) {
  const { color } = useTheme();
  const subtitle = [durationLabel(lesson), teacherClock(lesson)].filter(Boolean).join(' · ');
  const body = { fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
      }}
    >
      <AppText style={{ ...body, width: 48, fontVariant: ['tabular-nums'] }}>{riyadhTime(lesson.starts_at)}</AppText>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2} style={body}>
          {studentNames(lesson)}
        </AppText>
        {subtitle ? <AppText style={{ ...small, color: color.ink2, fontVariant: ['tabular-nums'] }}>{subtitle}</AppText> : null}
        {actions ??
          (canReschedule(lesson) || (onEditTime && editMode(lesson)) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 8 }}>
              {onEditTime ? <EditTimeButton lesson={lesson} onPress={() => onEditTime(lesson)} /> : null}
              {canReschedule(lesson) ? (
                <Button
                  variant="ghost"
                  label={t.lessons.rescheduleSubmit}
                  accessibilityLabel={`${t.lessons.rescheduleSubmit} — ${studentNames(lesson)}`}
                  onPress={() => onReschedule(lesson)}
                />
              ) : null}
            </View>
          ) : null)}
        <JoinClassroomButton lesson={lesson} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <LiveBadge lesson={lesson} />
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
        {lesson.trial ? <Tag>{t.schedule.trialTag}</Tag> : null}
        {lesson.makeup ? <Tag>{t.booking.makeup.tag}</Tag> : null}
      </View>
    </View>
  );
}
