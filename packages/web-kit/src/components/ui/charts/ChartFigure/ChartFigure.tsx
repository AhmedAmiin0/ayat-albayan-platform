import { SegmentedControl } from '@ab/web-kit/components/ui/form/SegmentedControl';
import { ScrollX } from '@ab/web-kit/components/ui/layout/scroll-x';
import type { ChartFigureProps } from './ChartFigure.types';
import { useChartFigure } from './use-chart-figure';
import { ChartTable } from './ChartTable';

/** A titled chart with a one-line summary and a chart/table switch over the same numbers. */
export function ChartFigure({ title, summary, words, table, children }: ChartFigureProps) {
  const { titleId, view, setView } = useChartFigure();
  return (
    <figure aria-labelledby={titleId} className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={titleId} className="font-display text-h4 font-bold text-balance text-ink">
          {title}
        </p>
        <SegmentedControl
          label={words.view}
          options={[
            { value: 'chart', label: words.chart },
            { value: 'table', label: words.table },
          ]}
          value={view}
          onChange={setView}
        />
      </div>
      <figcaption className="text-sm text-ink-2">{summary}</figcaption>
      {view === 'table' ? (
        <ScrollX label={title}>
          <ChartTable caption={title} data={table} />
        </ScrollX>
      ) : (
        <>
          {children}
          <div className="sr-only">
            <ChartTable caption={title} data={table} />
          </div>
        </>
      )}
    </figure>
  );
}
