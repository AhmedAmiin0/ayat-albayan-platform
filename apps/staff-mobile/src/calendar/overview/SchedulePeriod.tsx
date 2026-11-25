import { t } from '@ab/mobile-kit';
import type { ScheduleView } from './overview';
import { PeriodSwitcher } from '@ab/mobile-kit';
import { addDays, dayLabel, weekLabel, weekStart } from '@/calendar/lib/week';

interface SchedulePeriodProps {
  view: ScheduleView;
  /** The picked day (the viewer's calendar); the week view shows its week. */
  date: string;
  today: string;
  onDate: (date: string) => void;
}

export function SchedulePeriod({ view, date, today, onDate }: SchedulePeriodProps) {
  const day = view === 'day';
  const step = day ? 1 : 7;
  return (
    <PeriodSwitcher
      label={day ? dayLabel(date) : weekLabel(weekStart(date))}
      current={day ? date === today : weekStart(date) === weekStart(today)}
      prevLabel={day ? t.calendar.prevDay : t.schedule.prevWeek}
      nextLabel={day ? t.calendar.nextDay : t.schedule.nextWeek}
      onPrev={() => onDate(addDays(date, -step))}
      onNext={() => onDate(addDays(date, step))}
      onToday={() => onDate(today)}
    />
  );
}
