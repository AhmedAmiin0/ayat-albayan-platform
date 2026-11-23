import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { t, FilterPills, Screen, ScreenHeader } from '@ab/mobile-kit';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { ScheduleMonth } from '@/teacher/schedule/ScheduleMonth';
import { ScheduleWeek } from '@/teacher/schedule/ScheduleWeek';

type Period = 'week' | 'month';

const PERIODS = [
  { value: 'week' as const, label: t.teacherSchedule.week },
  { value: 'month' as const, label: t.teacherSchedule.month },
];

/** Availability lives in more because the tab bar holds five; this is its shortcut. */
const AVAILABILITY_HREF = '/teacher/more/availability';

const toAvailability = () => router.push(AVAILABILITY_HREF);

type Head = (subtitle: string) => ReactNode;
const PANES: Record<Period, (head: Head) => ReactNode> = {
  week: (head) => <ScheduleWeek head={head} />,
  month: (head) => <ScheduleMonth head={head} />,
};

/** Week and month (R-TCH-03, R-SCH-08) read once per period in her days and clock (docs/34). */
export function TeacherScheduleScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const head: Head = (subtitle) => (
    <>
      <ScreenHeader
        title={t.teacherNav.calendar}
        subtitle={subtitle}
        trailing={<PillButton label={t.availability.title} onPress={toAvailability} />}
      />
      <View style={{ marginBottom: 8 }}>
        <FilterPills
          items={PERIODS}
          value={period}
          onChange={setPeriod}
          accessibilityLabel={t.teacherSchedule.period}
          role="radiogroup"
        />
      </View>
    </>
  );
  return <Screen list>{PANES[period](head)}</Screen>;
}
