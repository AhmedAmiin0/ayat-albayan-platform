import { applyLessonEvent, lessonStatusStyle, type LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { durationLabel, riyadhTime, studentNames } from '@/today/lesson-text';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import { teacherClock } from './agenda';

export interface AgendaLessonRowProps {
  lesson: LessonView;
  /** «غيّر الميعاد» on the row; opens the reschedule sheet. */
  onReschedule: (lesson: LessonView) => void;
}

/** The API offered the move and the shared state machine allows it from this status. */
export function canReschedule(lesson: LessonView): boolean {
  return lesson.allowed_events.includes('reschedule') && applyLessonEvent(lesson.status, 'reschedule') !== null;
}

/**
 * One lesson in the agenda: the Riyadh start, the students, «45 دقيقة · عند المعلم/ة 15:00 بتوقيت
 * القاهرة», the status chip, and «غيّر الميعاد» always in view under the line when it can still move
 * (docs/07 §6: row actions are visible, never behind a tap a new admin would not guess).
 */
export function AgendaLessonRow({ lesson, onReschedule }: AgendaLessonRowProps) {
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
        {canReschedule(lesson) ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              variant="ghost"
              label={t.lessons.rescheduleSubmit}
              accessibilityLabel={`${t.lessons.rescheduleSubmit} — ${studentNames(lesson)}`}
              onPress={() => onReschedule(lesson)}
            />
          </View>
        ) : null}
      </View>
      <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
    </View>
  );
}
