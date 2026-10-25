import type { CSSProperties } from 'react';
import { hatchStyle } from '@/features/teachers/availability/DayTrack';
import type { Range } from '@/features/teachers/availability/grid';
import { barBox } from '@/features/teachers/availability/track';
import { cn } from '@/lib/utils';

// Hairline every 2h on the sunk track, from the inline-start (right in RTL), as DayTrack. docs/07 §8.
const trackStyle: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(to left, var(--rule) 0 1px, transparent 1px calc(100% / 8))',
};

const place = (range: Range): CSSProperties | null => {
  const box = barBox(range);
  return box && { insetInlineStart: `${box.start}%`, width: `${box.width}%` };
};

function Marks({ ranges, className, style }: { ranges: readonly Range[]; className: string; style?: CSSProperties }) {
  return ranges.map((range, i) => {
    const at = place(range);
    return at && <span key={`${i}-${range.start}-${range.end}`} className={cn('absolute', className)} style={{ ...style, ...at }} />;
  });
}

export interface ScheduleTrackProps {
  /** Weekly hours that day (Riyadh "HH:MM"). */
  windows: readonly Range[];
  off: readonly Range[];
  /** Lessons. */
  ticks: readonly Range[];
  /** Height: h-7 on the day board, h-3 in a week cell. */
  className?: string;
}

/**
 * Visual-only 08–24 track of one teacher's Riyadh day (the chips and gap buttons under it are the
 * accessible path): gold-wash availability, a cinnabar hatch over time off, 6px ink-2 lesson
 * ticks (docs/07 §8). DayTrack's look, without its editing state.
 */
export function ScheduleTrack({ windows, off, ticks, className }: ScheduleTrackProps) {
  return (
    <div aria-hidden="true" className={cn('relative h-7 w-full rounded-[4px] bg-sunk', className)} style={trackStyle}>
      <Marks ranges={windows} className="inset-y-[3px] rounded-[4px] border border-gold bg-gold-wash" />
      <Marks ranges={off} className="inset-y-px rounded-[3px] border border-danger/60" style={hatchStyle} />
      <Marks ranges={ticks} className="inset-y-0 my-auto h-1.5 rounded-[2px] bg-ink-2" />
    </div>
  );
}
