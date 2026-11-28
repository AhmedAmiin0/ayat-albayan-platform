import { cn } from '@ab/web-kit/lib/utils';
import type { StackedBarProps } from './StackedBar.types';
import { drawSegments, totalOf } from './stacked-bar.helpers';
import { ShareLegend } from './ShareLegend';

/**
 * One 100 % bar of shares with a legend that prints each glyph, label, value and percent, so the
 * bar itself is decorative and the legend is the reading.
 */
export function StackedBar({ label, segments, empty }: StackedBarProps) {
  const drawn = drawSegments(segments);
  if (totalOf(segments) === 0) return <p className="text-sm text-ink-2">{empty}</p>;
  return (
    <div role="group" aria-label={label} className="grid gap-2">
      <div aria-hidden="true" className="flex h-3 gap-px overflow-hidden rounded-sm bg-sunk">
        {drawn.map((s) => (
          <span
            key={s.key}
            data-fill={s.key}
            className={cn('block h-full', s.fill)}
            style={{ inlineSize: `${s.share * 100}%` }}
          />
        ))}
      </div>
      <ShareLegend segments={drawn} />
    </div>
  );
}
