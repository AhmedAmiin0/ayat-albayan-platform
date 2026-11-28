export interface ColumnMonth {
  key: string;
  label: string;
}

export interface ColumnSeries {
  key: string;
  label: string;
  /** One value per month, in the order of `months`. */
  values: readonly number[];
}

export interface ColumnChartProps {
  /** The chart's accessible name; its values are read from the ChartFigure table. */
  label: string;
  /** Oldest first, so the oldest month sits at inline-start in both directions. */
  months: readonly ColumnMonth[];
  /** One to three columns per month. */
  series: readonly ColumnSeries[];
  /** An optional line drawn over the columns, e.g. a margin. */
  line?: ColumnSeries;
}

export interface DrawnSeries extends ColumnSeries {
  fill: string;
}
