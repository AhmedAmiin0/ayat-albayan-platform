import { dayTile } from '@ab/client-core';
import { followSelected, cn } from '@ab/web-kit';
import { dayClock, dayDate } from '@/features/schedule/day-text';
import type { StripButtonProps } from './StripButton.types';
import { BUTTON, labelOf } from './strip-button.helpers';

/** One day of the strip: short weekday over the day number, a dot when it has lessons. */
export function StripButton({ day, selected, onJump }: StripButtonProps) {
  const tile = dayTile(dayDate(day.day), dayClock, 'short');
  return (
    <button
      type="button"
      ref={selected ? followSelected : undefined}
      aria-label={labelOf(day)}
      aria-current={day.today ? 'date' : undefined}
      aria-pressed={selected}
      disabled={day.count === 0}
      onClick={() => onJump(day.day)}
      className={BUTTON}
    >
      <span className="text-2xs">{tile.weekday}</span>
      <span className="text-sm font-semibold tabular-nums">{tile.day}</span>
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', day.count > 0 ? 'bg-lapis' : 'bg-transparent')}
      />
    </button>
  );
}
