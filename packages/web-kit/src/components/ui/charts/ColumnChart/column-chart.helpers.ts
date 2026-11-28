import type { ColumnChartProps, ColumnSeries, DrawnSeries } from './ColumnChart.types';

const SERIES_FILLS = ['bg-ink-3', 'bg-ink-2', 'bg-rule-strong'] as const;

/** The top of the scale; values below zero sit on the baseline and are read in the table. */
export function chartMax({ series, line }: Pick<ColumnChartProps, 'series' | 'line'>): number {
  const all = [...series, ...(line === undefined ? [] : [line])].flatMap((s) => s.values);
  return Math.max(0, ...all);
}

export function heightOf(value: number, max: number): string {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return `${Math.round(ratio * 1000) / 10}%`;
}

/** Polyline points in a 100×100 box, one per month at the middle of its slot. */
export function linePoints(values: readonly number[], max: number): string {
  const n = values.length;
  return values
    .map((v, i) => {
      const x = ((i + 0.5) / n) * 100;
      const y = 100 - Number.parseFloat(heightOf(v, max));
      return `${x},${y}`;
    })
    .join(' ');
}

export function drawSeries(series: readonly ColumnSeries[]): DrawnSeries[] {
  return series.map((s, i) => ({ ...s, fill: SERIES_FILLS[i % SERIES_FILLS.length] ?? 'bg-ink-3' }));
}
