import { cn } from '@ab/web-kit/lib/utils';
import type { ColumnChartProps } from './ColumnChart.types';
import { chartMax, drawSeries, heightOf, linePoints } from './column-chart.helpers';
import { SeriesKey } from './SeriesKey';
import { SeriesLine } from './SeriesLine';

/** Month columns, single or grouped, with an optional line; months flow from inline-start. */
export function ColumnChart({ label, months, series, line }: ColumnChartProps) {
  const max = chartMax({ series, line });
  const drawn = drawSeries(series);
  return (
    <div className="grid gap-2">
      <div
        role="img"
        aria-label={label}
        className="relative flex h-48 items-end gap-1 border-b border-rule"
      >
        {months.map((m, i) => (
          <div
            key={m.key}
            data-month={m.key}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
          >
            {drawn.map((s) => (
              <span
                key={s.key}
                data-column={s.key}
                className={cn('block w-full max-w-6 rounded-t-xs', s.fill)}
                style={{ blockSize: heightOf(s.values[i] ?? 0, max) }}
              />
            ))}
          </div>
        ))}
        {line !== undefined && <SeriesLine points={linePoints(line.values, max)} />}
      </div>
      <div aria-hidden="true" className="flex gap-1 text-2xs text-ink-3">
        {months.map((m) => (
          <span key={m.key} className="min-w-0 flex-1 truncate text-center">
            {m.label}
          </span>
        ))}
      </div>
      <SeriesKey series={drawn} lineLabel={line?.label} />
    </div>
  );
}
