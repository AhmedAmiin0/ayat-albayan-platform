import type { StripDay } from '@ab/client-core';
import { t } from '@ab/web-kit/i18n';
import { cn } from '@ab/web-kit/lib';
import { StripButton } from './StripButton';

// The tile behind the chosen day slides to the next one (motion.css `.ab-indicator`).
const INDICATOR = cn(
  'ab-indicator pointer-events-none absolute top-0 left-0 rounded-md bg-lapis-wash',
  'ring-2 ring-lapis',
);

interface WeekStripProps {
  days: readonly StripDay[];
  selected: string | null;
  onJump: (day: string) => void;
}

/**
 * The week at a glance (owner 2026-11-19: an agenda, not a grid): its seven days in one row, today
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
