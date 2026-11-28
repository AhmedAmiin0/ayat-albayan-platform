import type { ChartTableData, TableOfInput } from './ChartFigure.types';

/** The figure table of a chart: one row per label, one column per series; a gap reads as «—». */
export function tableOf({ head, rows, series, format = String }: TableOfInput): ChartTableData {
  return {
    columns: [head, ...series.map((s) => s.label)],
    rows: rows.map((r, i) => ({
      key: r.key,
      cells: [r.label, ...series.map((s) => valueCell(s.values[i], format))],
    })),
  };
}

function valueCell(value: number | undefined, format: (value: number) => string): string {
  return value === undefined ? '—' : format(value);
}
