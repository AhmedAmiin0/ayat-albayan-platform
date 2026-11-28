import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import { ColumnChart } from '@ab/web-kit/components/ui/charts/ColumnChart';
import {
  FAMILY_COLUMNS,
  FIGURE_WORDS,
  MONTH,
  MONTHS,
  STAFF_COLUMNS,
} from '@ab/web-kit/components/ui/charts/chart-samples';
import { ChartFigure } from './ChartFigure';
import { tableOf } from './chart-table-data';

/**
 * A staff month chart and a family attendance chart, each with its chart and table switch (44 px
 * segments), at 360 px in RTL and LTR, light and dark. Static, so reduced motion changes nothing.
 */
export function ChartFigureShowcase() {
  return (
    <div className="grid gap-3 p-4">
      {SHOWCASE_FRAMES.map((f) => (
        <section
          key={f.key}
          aria-label={f.key}
          dir={f.dir}
          data-theme={f.theme}
          className="grid max-w-90 gap-4 bg-card p-3"
        >
          <ChartFigure
            title={STAFF_COLUMNS.label}
            summary={STAFF_COLUMNS.line.label}
            words={FIGURE_WORDS}
            table={tableOf({ head: MONTH, rows: MONTHS, series: STAFF_COLUMNS.series })}
          >
            <ColumnChart {...STAFF_COLUMNS} months={MONTHS} />
          </ChartFigure>
          <ChartFigure
            title={FAMILY_COLUMNS.label}
            summary={FAMILY_COLUMNS.series[0]?.label ?? ''}
            words={FIGURE_WORDS}
            table={tableOf({ head: MONTH, rows: MONTHS, series: FAMILY_COLUMNS.series })}
          >
            <ColumnChart {...FAMILY_COLUMNS} months={MONTHS} />
          </ChartFigure>
        </section>
      ))}
    </div>
  );
}
