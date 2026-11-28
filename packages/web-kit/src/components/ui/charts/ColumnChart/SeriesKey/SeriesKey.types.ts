import type { DrawnSeries } from '@ab/web-kit/components/ui/charts/ColumnChart/ColumnChart.types';

export interface SeriesKeyProps {
  series: readonly DrawnSeries[];
  lineLabel?: string;
}
