import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { Range } from './grid';
import { barBox, overlaps, trackPct } from './track';

// Hairline every 2h on the sunk track, starting at the inline-start (right in RTL). docs/07 §8.
const trackStyle: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(to left, var(--rule) 0 1px, transparent 1px calc(100% / 8))',
};
export const hatchStyle: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, color-mix(in oklab, var(--cinnabar) 55%, transparent) 0 2px, transparent 2px 5px)',
};

const place = (range: Range): CSSProperties | null => {
  const box = barBox(range);
  return box && { insetInlineStart: `${box.start}%`, width: `${box.width}%` };
};

type Props = {
  ranges: readonly Range[];
  /** Minute of the day on today's row, else null. */
  now: number | null;
  /** Index of the range whose selects have focus: drawn as the band being edited. */
  editing?: number | null;
};

const grip = 'absolute top-1/2 h-3.5 w-[5px] -translate-y-1/2 rounded-[2px] bg-lapis';

/**
 * Visual-only 08–24 track of one day (the selects are the accessible path): gold-wash bars for
 * available ranges, a cinnabar hatch where two overlap, a 2px ink now-line on today's row. The
 * band being edited gets a lapis border, halo and two grips (docs/07 §8).
 * Booked-lesson ticks are drawn on the calendar's ScheduleTrack (features/schedule), not here.
 */
export function DayTrack({ ranges, now, editing = null }: Props) {
  const nowPct = now === null ? null : trackPct(now);
  return (
    <div className="relative h-7 w-full rounded-[4px] bg-sunk" style={trackStyle}>
      {ranges.map((range, i) => {
        const style = place(range);
        return (
          style && (
            <span
              key={`bar-${i}`}
              data-bar={i === editing ? 'editing' : ''}
              className={cn(
                'absolute inset-y-[3px] rounded-[4px] bg-gold-wash',
                i === editing
                  ? 'border-[1.5px] border-lapis shadow-[0_0_0_3px_color-mix(in_oklab,var(--lapis)_22%,transparent)]'
                  : 'border border-gold',
              )}
              style={style}
            >
              {i === editing && (
                <>
                  <i className={cn(grip, '-start-[3px]')} />
                  <i className={cn(grip, '-end-[3px]')} />
                </>
              )}
            </span>
          )
        );
      })}
      {overlaps(ranges).map((span) => {
        const style = place(span);
        return (
          style && (
            <span
              key={`clash-${span.start}`}
              data-clash=""
              className="absolute inset-y-px rounded-[3px] border-[1.5px] border-danger"
              style={{ ...hatchStyle, ...style }}
            />
          )
        );
      })}
      {nowPct !== null && nowPct > 0 && nowPct < 100 && (
        <span data-now="" className="absolute -inset-y-1 w-0.5 rounded-[1px] bg-ink" style={{ insetInlineStart: `${nowPct}%` }} />
      )}
    </div>
  );
}
