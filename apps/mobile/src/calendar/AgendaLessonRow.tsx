import { applyLessonEvent, lessonStatusStyle, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { durationLabel, riyadhTime, studentNames } from '@/today/lesson-text';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import { teacherClock } from './agenda';

export interface AgendaLessonRowProps {
  lesson: LessonView;
  /** «غيّر الميعاد» from the row's actions; opens the reschedule sheet. */
  onReschedule: (lesson: LessonView) => void;
}

/** The API offered the move and the shared state machine allows it from this status. */
export function canReschedule(lesson: LessonView): boolean {
  return lesson.allowed_events.includes('reschedule') && applyLessonEvent(lesson.status, 'reschedule') !== null;
}

/**
 * One lesson in the agenda: the Riyadh start, the students, «45 دقيقة · عند المعلم/ة 15:00 بتوقيت
 * القاهرة» and the status chip. A tap opens its actions («غيّر الميعاد») when it can still move.
 */
export function AgendaLessonRow({ lesson, onReschedule }: AgendaLessonRowProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const movable = canReschedule(lesson);
  const subtitle = [durationLabel(lesson), teacherClock(lesson)].filter(Boolean).join(' · ');
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  const body = (
    <>
      <AppText
        style={{
          width: 48,
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {riyadhTime(lesson.starts_at)}
      </AppText>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          numberOfLines={2}
          style={{ fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
        >
          {studentNames(lesson)}
        </AppText>
        {subtitle ? (
          <AppText style={{ ...small, color: color.ink2, fontVariant: ['tabular-nums'] }}>{subtitle}</AppText>
        ) : null}
      </View>
      <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
    </>
  );
  const row = { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 } as const;
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: color.rule }}>
      {movable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t.lessons.actions}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={({ pressed }) => [row, pressed ? { backgroundColor: color.sunk } : null]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={row}>{body}</View>
      )}
      {open && movable ? (
        <View accessibilityLabel={t.lessons.actions} style={{ paddingBottom: 10 }}>
          <Button variant="secondary" label={t.lessons.rescheduleSubmit} onPress={() => onReschedule(lesson)} />
        </View>
      ) : null}
    </View>
  );
}
