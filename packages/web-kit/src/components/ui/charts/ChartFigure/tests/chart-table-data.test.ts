import { describe, expect, it } from 'vitest';
import { tableOf } from '@ab/web-kit/components/ui/charts/ChartFigure';

const ROWS = [
  { key: 'jan', label: 'يناير' },
  { key: 'feb', label: 'فبراير' },
];

describe('tableOf', () => {
  it('heads the table with the row header then one column per series', () => {
    const table = tableOf({
      head: 'الشهر',
      rows: ROWS,
      series: [
        { label: 'أ', values: [1, 2] },
        { label: 'ب', values: [3, 4] },
      ],
    });
    expect(table.columns).toEqual(['الشهر', 'أ', 'ب']);
    expect(table.rows).toEqual([
      { key: 'jan', cells: ['يناير', '1', '3'] },
      { key: 'feb', cells: ['فبراير', '2', '4'] },
    ]);
  });

  it('formats values with the given formatter', () => {
    const table = tableOf({
      head: 'h',
      rows: ROWS,
      series: [{ label: 'أ', values: [1.5, 2] }],
      format: (n) => n.toFixed(2),
    });
    expect(table.rows[0]?.cells).toEqual(['يناير', '1.50']);
  });

  it('prints a dash for a month a series has no value for', () => {
    const table = tableOf({ head: 'h', rows: ROWS, series: [{ label: 'أ', values: [7] }] });
    expect(table.rows[1]?.cells).toEqual(['فبراير', '—']);
  });

  it('gives a header-only table when there are no rows', () => {
    expect(tableOf({ head: 'h', rows: [], series: [] })).toEqual({ columns: ['h'], rows: [] });
  });
});
