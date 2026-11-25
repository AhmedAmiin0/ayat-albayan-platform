import type { ReactNode } from 'react';
import { SegmentedControl, t } from '@ab/web-kit';
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
