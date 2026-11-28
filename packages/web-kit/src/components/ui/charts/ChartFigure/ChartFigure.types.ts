import type { ReactNode } from 'react';
import type { ChartView } from './chart-figure.schemas';

export interface ChartTableRow {
  key: string;
  /** The first cell heads the row, e.g. the month. */
  cells: readonly string[];
}

export interface ChartTableData {
  columns: readonly string[];
  rows: readonly ChartTableRow[];
}

export interface ChartFigureWords {
  /** The toggle's group name. */
  view: string;
  chart: string;
  table: string;
}

export interface ChartFigureProps {
  title: string;
  /** One sentence that states what the chart shows, read before it. */
  summary: string;
  words: ChartFigureWords;
  /** The same numbers as the chart: always read by screen readers, shown on «table». */
  table: ChartTableData;
  children: ReactNode;
}

export interface ChartFigureView {
  titleId: string;
  view: ChartView;
  setView: (view: ChartView) => void;
}

export interface TableSeries {
  label: string;
  values: readonly number[];
}

export interface TableOfInput {
  /** The first column's header, e.g. «Month». */
  head: string;
  rows: readonly { key: string; label: string }[];
  series: readonly TableSeries[];
  format?: (value: number) => string;
}
