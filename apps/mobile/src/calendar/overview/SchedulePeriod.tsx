import { t } from '@/core/lib/i18n/i18n';
import type { ScheduleView } from './overview';
import { PeriodSwitcher } from './PeriodSwitcher';
import { addDays, dayLabel, weekLabel, weekStart } from '../lib/week';

interface SchedulePeriodProps {
  view: ScheduleView;
  /** The picked Riyadh day; the week view shows its week. */
  date: string;
  today: string;
  onDate: (date: string) => void;
}

/** ‹ «الخميس 1 أكتوبر» › a day at a time, or ‹ «26 سبتمبر – 2 أكتوبر» › a week at a time. */
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
