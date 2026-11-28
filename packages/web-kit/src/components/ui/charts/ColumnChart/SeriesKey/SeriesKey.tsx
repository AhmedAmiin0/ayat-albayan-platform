import { cn } from '@ab/web-kit/lib/utils';
import type { SeriesKeyProps } from './SeriesKey.types';

/** The key names every series in order; the swatch shape tells a column from the line. */
export function SeriesKey({ series, lineLabel }: SeriesKeyProps) {
  return (
    <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className={cn('block size-2.5 rounded-xs', s.fill)} />
          {s.label}
        </li>
      ))}
      {lineLabel !== undefined && (
        <li data-key-line className="flex items-center gap-1.5">
          <span className="block h-0.5 w-3 rounded-full bg-ink" />
          {lineLabel}
        </li>
      )}
    </ul>
  );
}
