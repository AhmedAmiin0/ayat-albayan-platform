import { cn } from '@ab/web-kit/lib/utils';
import type { BarProps } from './Bar.types';
import { shareOf } from './bar.helpers';

/**
 * The one bar mark of every chart: square at the baseline (inline-start), a rounded data end and
 * one neutral ink in both themes. Decorative: the value is printed beside it and the chart's table
 * is the accessible view.
 */
export function Bar({ value, max, className }: BarProps) {
  const share = shareOf(value, max);
  return (
    <span
      aria-hidden="true"
      data-share={share.toFixed(3)}
      className={cn('block h-2.5 min-w-12 flex-1', className)}
    >
      {share > 0 && (
        <span
          data-bar-fill
          className="block h-full rounded-e-sm bg-ink-3"
          style={{ inlineSize: `${share * 100}%` }}
        />
      )}
    </span>
  );
}
