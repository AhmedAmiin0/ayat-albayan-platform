import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SheetSpec } from './headers/headers.ts';
import { extractSheets } from './extract-sheets.ts';

const state = vi.hoisted(() => ({
  written: new Map<string, unknown>(),
  grids: new Map<string, { sheet: string; data: unknown[][] }[]>(),
  entries: [] as { name: string; size: number }[],
  specs: [] as SheetSpec[],
}));

vi.mock('../cache.ts', () => ({
  cachePath: {
    sheet: (id: string) => `sheet/${id}`,
    files: () => 'files',
    sheetManifest: () => 'manifest',
  },
  writeJson: (path: string, value: unknown) => state.written.set(path, value),
}));

vi.mock('./headers/headers.ts', () => ({
  get SHEETS() {
    return state.specs;
  },
  specsFor: (name: string) =>
    state.specs.filter((s) => (typeof s.file === 'string' ? s.file === name : s.file.test(name))),
}));

vi.mock('./zip.ts', () => ({
  resolveZipPath: (zip: string | undefined) => zip ?? 'export.zip',
  openZip: (path: string) => ({
    path: `/x/${path}`,
    sha256: 'sha',
    entries: state.entries,
    read: (want: (n: string) => boolean) =>
      Object.fromEntries(
        [...state.grids.keys()].filter(want).map((n) => [n, new TextEncoder().encode(n)]),
      ),
  }),
  readWorkbook: (bytes: Uint8Array) =>
    Promise.resolve(state.grids.get(new TextDecoder().decode(bytes)) ?? []),
}));

const spec = (id: string, file: string | RegExp): SheetSpec => ({
  id,
  source: 'HUB',
  file,
  tab: 'T',
  headerRow: 1,
  fields: { name: 'name' },
});

beforeEach(() => {
  state.written.clear();
  state.grids.clear();
  state.entries = [];
  state.specs = [spec('a', 'a.xlsx'), spec('p', /^p\d\.xlsx$/)];
});

describe('extractSheets', () => {
  it('writes rows, unknown headers, report media and the manifest', async () => {
    state.grids.set('a.xlsx', [
      {
        sheet: 'T',
        data: [
          ['name', 'x'],
          ['ليان', 1],
        ],
      },
    ]);
    state.grids.set('p1.xlsx', [
      {
        sheet: 'T',
        data: [
          ['name', 'y'],
          ['أ', 1],
        ],
      },
    ]);
    state.grids.set('p2.xlsx', [
      {
        sheet: 'T',
        data: [
          ['name', 'y', 'z'],
          ['ب', 1, 2],
        ],
      },
    ]);
    state.entries = [
      { name: 'تقارير آيات البيان/r.pdf', size: 1 },
      { name: 'تقارير آيات البيان/r.xlsx', size: 1 },
      { name: 'تقارير آيات البيان/dir/', size: 0 },
      { name: 'other.pdf', size: 1 },
    ];
    const m = await extractSheets({ zip: 'z.zip' });
    expect(m.zip).toBe('z.zip');
    expect(m.rows).toEqual({ a: 1, p: 2 });
    expect(m.unknownHeaders).toEqual({ a: ['x'], p: ['y', 'z'] });
    expect(state.written.get('files')).toEqual([{ name: 'تقارير آيات البيان/r.pdf', size: 1 }]);
    expect(state.written.get('manifest')).toEqual(m);
    expect(state.written.get('sheet/p')).toHaveLength(2);
  });

  it('leaves a spec without unknown headers out of the manifest list', async () => {
    state.grids.set('a.xlsx', [{ sheet: 'T', data: [['name'], ['ليان']] }]);
    const m = await extractSheets({});
    expect(m.unknownHeaders).toEqual({});
    expect(m.rows).toEqual({ a: 1, p: 0 });
  });

  it('fails loud on a missing tab, missing headers and a file not in the zip', async () => {
    state.specs.push(spec('b', 'b.xlsx'));
    state.grids.set('a.xlsx', [{ sheet: 'Other', data: [] }]);
    state.grids.set('p1.xlsx', [{ sheet: 'T', data: [['nom'], ['x']] }]);
    await expect(extractSheets({})).rejects.toThrow(
      ['a: tab «T» missing in a.xlsx', 'p: headers missing name', 'b: file not in zip'].join('\n'),
    );
    expect(state.written.size).toBe(0);
  });
});
