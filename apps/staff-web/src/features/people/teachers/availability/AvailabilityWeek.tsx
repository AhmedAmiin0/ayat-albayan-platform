import type { Weekday } from '@ab/shared';
import { forwardRef } from 'react';
import { useMinuteClock } from '@/components/ui/layout/running-head';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { AvailabilityDay, cellClass, trackCellClass, weekRowClass } from './AvailabilityDay';
import { hatchStyle } from './DayTrack';
import { WEEK_ORDER, type Grid, type Range } from './grid';
import { AXIS_HOURS, trackPct, wallClock } from './track';

type Props = { grid: Grid; tz: string; onDay: (day: Weekday, ranges: Range[]) => void };

const headClass = 'py-2 text-2xs font-semibold text-ink-3';

/** 08 … 24 above the track; the first and last labels sit inside its ends; the rest centre on
 * their hour, shifting toward the inline-start edge (right in RTL, left in LTR). */
function Axis() {
  return (
    <div className="relative h-[18px] w-full text-2xs text-ink-3 tabular-nums">
      {AXIS_HOURS.map((h, i) => (
        <span
          key={h}
          data-axis-hour={h}
          className={cn(
            'absolute',
            i > 0 && i < AXIS_HOURS.length - 1 && 'rtl:translate-x-1/2 ltr:-translate-x-1/2',
            i === AXIS_HOURS.length - 1 && 'end-0',
          )}
          style={i === AXIS_HOURS.length - 1 ? undefined : { insetInlineStart: `${trackPct(h * 60)}%` }}
        >
          {String(h).padStart(2, '0')}
        </span>
      ))}
    </div>
  );
}

/** Track key. Booked lessons join it with R-SCH-01. */
function Legend() {
  const items = [
    { label: t.availability.legendAvailable, swatch: 'h-3 w-[22px] rounded-[3px] border border-gold bg-gold-wash' },
    { label: t.availability.legendOverlap, swatch: 'h-3 w-[22px] rounded-[3px] border-[1.5px] border-danger', hatch: true },
    { label: t.availability.legendNow, swatch: 'h-3.5 w-0.5 rounded-[1px] bg-ink' },
  ];
  return (
    <div aria-hidden="true" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-2xs text-ink-3">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-[7px]">
          <i className={item.swatch} style={item.hatch ? hatchStyle : undefined} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * The week as a role=table, one row per weekday from السبت to الجمعة (docs/07 §8): 92px day,
 * 452px ranges, then the track; the track drops under the ranges in narrower pages.
 */
export const AvailabilityWeek = forwardRef<HTMLDivElement, Props>(function AvailabilityWeek({ grid, tz, onDay }, ref) {
  const clock = wallClock(useMinuteClock(), tz);
  return (
    <>
      <div ref={ref} role="table" aria-label={t.availability.title} className="border-y border-rule">
        <div role="row" className={weekRowClass}>
          <span role="columnheader" className={cn(cellClass, headClass, 'hidden @min-[640px]:flex')}>
            {t.availability.weekday}
          </span>
          <span role="columnheader" className={cn(cellClass, headClass, 'hidden @min-[1000px]:flex')}>
            {`${t.availability.from}${t.common.listSeparator}${t.availability.to}`}
          </span>
          <div aria-hidden="true" className={cn(trackCellClass, headClass, 'pb-2')}>
            <Axis />
          </div>
        </div>
        {WEEK_ORDER.map((day) => (
          <AvailabilityDay
            key={day}
            day={day}
            ranges={grid[day]}
            now={day === clock.weekday ? clock.minute : null}
            onChange={(ranges) => onDay(day, ranges)}
          />
        ))}
      </div>
      <Legend />
    </>
  );
});
