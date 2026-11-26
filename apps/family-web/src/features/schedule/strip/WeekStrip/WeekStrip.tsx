import { t } from '@ab/web-kit';
import { StripButton } from '@/features/schedule/strip/StripButton';
import type { WeekStripProps } from './WeekStrip.types';
import { INDICATOR } from './week-strip.helpers';

/**
 * The week at a glance as an agenda, not a grid: its seven days in one row, today
 * marked, a dot under each day with lessons; a tap jumps to that day below. Seven 44 px days with
 * this spacing (326 px) fit a 360 px phone inside its 16 px gutters: any wider and the page
 * overflows, so a phone zooms the whole page out.
 */
export function WeekStrip({ days, selected, onJump }: WeekStripProps) {
  return (
    <div
      role="group"
      aria-label={t.portal.app.schedule.days}
      data-indicator-host
      className="relative flex gap-0.5 rounded-lg border border-rule bg-raised p-0.5"
    >
      <span data-indicator hidden aria-hidden="true" className={INDICATOR} />
      {days.map((day) => (
        <StripButton key={day.day} day={day} selected={day.day === selected} onJump={onJump} />
      ))}
    </div>
  );
}
