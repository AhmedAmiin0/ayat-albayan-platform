import { addDays, weekdayOf, weekStart } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ScheduleSearch } from './filters/search';
import { dayMonthLabel } from '@ab/web-kit/schedule/tz';

export interface ScheduleNavProps {
  search: ScheduleSearch;
  /** Today's date in the viewer's zone. */
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

/** Viewer's zone (R-SCH-01); day to week opens that week; week to day opens today or Saturday. */
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
      <span className="text-xs text-ink-3">{t.schedule.viewerTime}</span>
    </div>
  );
}
