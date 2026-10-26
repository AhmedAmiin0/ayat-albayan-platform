// Invented, anonymised grid (no real rows).
import { describe, expect, it } from 'vitest';
import type { SheetSpec } from './headers/headers.ts';
import { cellOf, headerNames, sheetRows } from './rows.ts';

const spec: SheetSpec = {
  id: 't',
  source: 'HUB',
  file: 'x.xlsx',
  tab: 'tab',
  headerRow: 2,
  fields: { الاسم: 'name', 'وقت البدء 2': 'start_time', '@A': 'label', Missing: 'gone' },
  ignore: ['ابعت'],
};

describe('cellOf', () => {
  it('normalises library values', () => {
    expect(cellOf('  x ')).toBe('x');
    expect(cellOf('   ')).toBeNull();
    expect(cellOf(undefined)).toBeNull();
    expect(cellOf(3)).toBe(3);
    expect(cellOf(true)).toBe(true);
    expect(cellOf(new Date(Date.UTC(2026, 8, 1)))).toBe('2026-09-01');
    expect(cellOf({ toString: () => 'obj' })).toBe('obj');
  });
});

describe('headerNames', () => {
  it('numbers repeated headers and squeezes spaces', () => {
    expect(
      headerNames(['وقت البدء', null, 'وقت  البدء', 'Column 19', 'Column 19', 'Column 19']),
    ).toEqual(['وقت البدء', '', 'وقت البدء 2', 'Column 19', 'Column 19 2', 'Column 19 3']);
  });
});

describe('sheetRows', () => {
  const data = [
    ['عنوان', null, null, null],
    [null, 'الاسم', 'وقت البدء', 'وقت البدء', 'ابعت', 'Extra'],
    ['L1', 'ليلى', '10:00', new Date(Date.UTC(1899, 11, 30, 17, 0)), 'btn', 'e'],
    [null, null, null, null, 'btn'],
    ['L2', 'منى', null, null],
  ];

  it('maps by header text, @letter and repeat index; skips empty rows', () => {
    const r = sheetRows({ spec, data });
    expect(r.rows).toEqual([
      {
        ref: { source: 'HUB', tab: 'tab', row: 3 },
        fields: { name: 'ليلى', start_time: '17:00', label: 'L1' },
      },
      {
        ref: { source: 'HUB', tab: 'tab', row: 5 },
        fields: { name: 'منى', start_time: null, label: 'L2' },
      },
    ]);
  });

  it('reports missing and unknown headers', () => {
    const r = sheetRows({ spec, data });
    expect(r.missing).toEqual(['Missing']);
    expect(r.unknown).toEqual(['وقت البدء', 'Extra']);
  });

  it('records the file only for pattern specs', () => {
    const multi = { ...spec, file: /\.xlsx$/ };
    expect(sheetRows({ spec: multi, data, file: 'a/b.xlsx' }).rows[0]?.ref.file).toBe('a/b.xlsx');
    expect(sheetRows({ spec, data, file: 'x.xlsx' }).rows[0]?.ref.file).toBeUndefined();
  });

  it('tolerates a sheet shorter than its header row', () => {
    expect(sheetRows({ spec, data: [] }).rows).toEqual([]);
  });
});
