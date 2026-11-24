import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';
import { t, Button, AppText, raisedCard, type, useTheme } from '@ab/mobile-kit';
import { studentNames } from '@/today';
import type { DayEndKind } from './teacher-day';

const TITLE: Record<DayEndKind, string> = {
  empty: t.teacherDash.noLessonsToday,
  done: t.today.quietTitle,
};

interface TeacherDayEndProps {
  /** null: nothing to say (something is still ahead, or nothing loaded yet). */
  kind: DayEndKind | null;
  /** Her next open lesson within two weeks (nextOpenLesson), or null. */
  next: LessonView | null;
}

const titleStyle = { fontFamily: type.ui[700], fontSize: 17, lineHeight: 28 } as const;
const lineStyle = { fontFamily: type.ui[400], fontSize: type.size.sm, lineHeight: 22 } as const;

/** Shows her next lesson, or that none falls in the next two weeks (docs/48). */
export function TeacherDayEnd({ kind, next }: TeacherDayEndProps) {
  const { color } = useTheme();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  if (kind === null) return null;
  const line = next
    ? t.teacherToday.nextLesson
        .replace('{when}', whenIn(new Date(next.starts_at), tz, cycle))
        .replace('{names}', studentNames(next))
    : t.teacherToday.noneSoon;
  return (
    <View style={{ ...raisedCard(color), padding: 16, gap: 8 }} testID="teacher-day-end">
      <AppText accessibilityRole="header" style={{ ...titleStyle, color: color.ink }}>
        {TITLE[kind]}
      </AppText>
      <AppText style={{ ...lineStyle, color: color.ink2, fontVariant: ['tabular-nums'] }}>
        {line}
      </AppText>
      <Button
        variant="secondary"
        label={t.teacherToday.openSchedule}
        onPress={() => router.navigate('/teacher/schedule')}
      />
    </View>
  );
}
