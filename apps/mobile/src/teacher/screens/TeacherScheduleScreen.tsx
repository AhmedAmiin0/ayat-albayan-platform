import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { ScheduleMonth } from '@/teacher/schedule/ScheduleMonth';
import { ScheduleWeek } from '@/teacher/schedule/ScheduleWeek';

type Period = 'week' | 'month';

const PERIODS = [
  { value: 'week' as const, label: t.teacherSchedule.week },
  { value: 'month' as const, label: t.teacherSchedule.month },
];

/** «المواعيد المتاحة» lives in «المزيد» (the native tab bar holds five); this is its shortcut. */
export const AVAILABILITY_HREF = '/teacher/more/availability';

const toAvailability = () => router.push(AVAILABILITY_HREF);

type Head = (subtitle: string) => ReactNode;
const PANES: Record<Period, (head: Head) => ReactNode> = {
  week: (head) => <ScheduleWeek head={head} />,
  month: (head) => <ScheduleMonth head={head} />,
};

/**
 * «جدولي» (R-TCH-03, R-SCH-08; owner 2026-11-14): «الأسبوع | الشهر». The week is the day-by-day
 * agenda السبت → الجمعة; the month a Saturday-first grid whose day lists its lessons. Both read
 * GET /teachers/me/lessons once per shown period, in her own days and clock (docs/34); a lesson
 * opens «تفاصيل الحلقة» (teacher variant). «المواعيد المتاحة» is one tap away in the header.
 */
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
