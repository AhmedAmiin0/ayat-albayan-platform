import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { AppText } from '@/core/ui/primitives/AppText';
import { raisedCard } from '@/core/ui/surface/surface';
import { type, useTheme } from '@/theme';
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

/**
 * Nothing open left today, or no lessons at all (docs/48): one card with «انتهت حلقات اليوم» or
 * «لا توجد حلقات اليوم», where her next lesson is («حلقتك القادمة: الأحد 16:00 · يوسف») or that
 * none is in the next two weeks, and «افتح جدولي».
 */
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
