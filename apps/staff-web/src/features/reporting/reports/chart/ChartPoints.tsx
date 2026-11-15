import { useState } from 'react';
import { cn } from '@/lib/utils';
import { tooltipAnchor, type ChartPoint } from './chart';
import { gradeWord, shortDate } from './chart-labels';

const ANCHOR = {
  start: '',
  center: 'ltr:-translate-x-1/2 rtl:translate-x-1/2',
  end: 'ltr:-translate-x-full rtl:translate-x-full',
} as const;

/**
 * The graded points: 8px dots with a 2px page-colour ring, each inside a 24px hover / focus
 * target that shows date and grade (value first). Ungraded reports have no dot.
 */
export function ChartPoints({ points, tz }: { points: readonly ChartPoint[]; tz: string }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = points.find((p) => p.id === active && p.y !== null);
  return (
    <>
      {points.map((p) =>
        p.y === null ? null : (
          <span
            key={p.id}
            tabIndex={0}
            role="img"
            aria-label={`${shortDate(p.at, tz)}: ${gradeWord(p.score)}`}
            onPointerEnter={() => setActive(p.id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(p.id)}
            onBlur={() => setActive(null)}
            className="absolute grid size-6 -translate-y-1/2 place-items-center rounded-full outline-offset-0 ltr:-translate-x-1/2 rtl:translate-x-1/2"
            style={{ insetInlineStart: `${p.pos}%`, top: `${p.y}%` }}
          >
            <span className={cn('size-3 rounded-full border-2 border-card bg-lapis', active === p.id && 'size-3.5')} />
          </span>
        ),
      )}
      {shown && shown.y !== null && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-10 -translate-y-[calc(100%+14px)] rounded-md border border-rule-strong bg-raised px-2.5 py-1.5 whitespace-nowrap shadow-[var(--elev-toast)]',
            ANCHOR[tooltipAnchor(shown.pos)],
          )}
          style={{ insetInlineStart: `${shown.pos}%`, top: `${shown.y}%` }}
        >
          <p className="text-sm font-semibold text-ink">{gradeWord(shown.score)}</p>
          <p className="text-2xs text-ink-3">{shortDate(shown.at, tz)}</p>
        </div>
      )}
    </>
  );
}
