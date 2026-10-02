import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { t } from '@/lib/i18n';
import type { ScheduleSearch } from './search';
import { addDays, dayMonthLabel, weekdayOf, weekStart } from './tz';

export interface ScheduleNavProps {
  search: ScheduleSearch;
  /** Today's Riyadh date. */
  today: string;
  onSearch: (patch: Partial<ScheduleSearch>) => void;
}

type View = 'day' | 'week';
const VIEWS: { value: View; label: string }[] = [
  { value: 'day', label: t.schedule.viewDay },
  { value: 'week', label: t.schedule.viewWeek },
];
const weekday: Record<string, string> = t.enums.weekday;

/** Today's day / this week are the defaults, so they stay out of the URL. */
const orDefault = (value: string, fallback: string) => (value === fallback ? undefined : value);

/**
 * «اليوم | الأسبوع», a day or a week back and forward, «النهارده» / «الأسبوع ده», and the date
 * shown (Riyadh, R-SCH-01). Day → week opens that day's week; week → day opens today when it is
 * in that week, else its Saturday.
 */
export function ScheduleNav({ search, today, onSearch }: ScheduleNavProps) {
  const thisWeek = weekStart(today);
  const isDay = search.view === 'day';
  const day = search.day ?? today;
  const week = search.week ?? thisWeek;
  const step = (n: number) =>
    isDay ? onSearch({ day: orDefault(addDays(day, n), today) }) : onSearch({ week: orDefault(addDays(week, 7 * n), thisWeek) });
  const show = (view: View) =>
    view === 'day'
      ? onSearch({ view: 'day', day: week === thisWeek ? undefined : week, week: undefined })
      : onSearch({ view: undefined, day: undefined, week: orDefault(weekStart(day), thisWeek) });
  const atToday = isDay ? day === today : week === thisWeek;
  const label = isDay
    ? `${weekday[String(weekdayOf(day))] ?? ''} ${dayMonthLabel(day)}`
    : t.schedule.weekOf.replace('{date}', dayMonthLabel(week));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl label={t.schedule.viewLabel} options={VIEWS} value={isDay ? 'day' : 'week'} onChange={show} />
      <Button type="button" variant="secondary" size="sm" onClick={() => step(-1)}>
        <Icon name="chevron-right" />
        {isDay ? t.schedule.prevDay : t.schedule.prevWeek}
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={atToday} onClick={() => onSearch({ day: undefined, week: undefined })}>
        {isDay ? t.schedule.today : t.schedule.thisWeek}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => step(1)}>
        {isDay ? t.schedule.nextDay : t.schedule.nextWeek}
        <Icon name="chevron-left" />
      </Button>
      <span aria-live="polite" className="ms-1 text-sm font-semibold tabular-nums">
        {label}
      </span>
      <span className="text-xs text-ink-3">{t.schedule.riyadhTime}</span>
    </div>
  );
}
