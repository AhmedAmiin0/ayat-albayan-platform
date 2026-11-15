import type { ReactNode } from 'react';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import type { CalendarPeriod } from './calendar-search';
import { MyWeek } from './lessons/MyWeek';
import { MyMonth } from './schedule/MyMonth';

export interface TeacherCalendarProps {
  period: CalendarPeriod;
  onPeriod: (period: CalendarPeriod) => void;
}

const OPTIONS = [
  { value: 'week' as const, label: t.teacherSchedule.week },
  { value: 'month' as const, label: t.teacherSchedule.month },
];

const PERIODS: Record<CalendarPeriod, (toggle: ReactNode) => ReactNode> = {
  week: (toggle) => <MyWeek toggle={toggle} />,
  month: (toggle) => <MyMonth toggle={toggle} />,
};

/** /teacher/calendar «جدولي»: «الأسبوع | الشهر» in the head (owner 2026-11-14). */
export function TeacherCalendar({ period, onPeriod }: TeacherCalendarProps) {
  const toggle = (
    <SegmentedControl
      label={t.teacherSchedule.period}
      options={OPTIONS}
      value={period}
      onChange={onPeriod}
      className="ms-auto"
    />
  );
  return PERIODS[period](toggle);
}
