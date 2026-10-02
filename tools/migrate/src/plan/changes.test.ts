// Field-level changes of planned updates, against an in-memory target.
import { describe, expect, it } from 'vitest';
import type { EntityModule } from '../entities/contract.ts';
import { keys } from '../keys.ts';
import type { Existing, PlanItem } from '../types.ts';
import { fieldChanges, loadChanges, sameValue } from './changes.ts';
import { fakeDb } from './fake-db.ts';

const G = keys.guardian('+201000000001');
const S = keys.student({ guardianPhone: G.key, name: 'ليلى' });
const item = (o: Partial<PlanItem> & Pick<PlanItem, 'key'>): PlanItem => ({
  action: 'update',
  targetId: 's-1',
  hash: 'h',
  record: { columns: {}, refs: {} },
  ref: { source: 'HUB', tab: 't', row: 2 },
  ...o,
});

describe('sameValue', () => {
  it('compares the way Postgres returns values', () => {
    expect(sameValue(null, undefined)).toBe(true);
    expect(sameValue('', null)).toBe(true);
    expect(sameValue('09:30', '09:30:00')).toBe(true);
    expect(sameValue('2026-08-01T07:00:00.000Z', '2026-08-01T10:00:00+03:00')).toBe(true);
    expect(sameValue(5, '5')).toBe(true);
    expect(sameValue([6, 2], [6, 2])).toBe(true);
    expect(sameValue({ b: 1, a: 2 }, { a: 2, b: 1 })).toBe(true);
    expect(sameValue('2026-08-01', '2026-08-02')).toBe(false);
    expect(sameValue([2, 6], [6, 2])).toBe(false);
  });
});

describe('fieldChanges', () => {
  it('lists changed columns and refs only', () => {
    const it1 = item({
      key: S,
      record: { columns: { name: 'ليلى', age: 9, level: null }, refs: { guardian_id: G } },
    });
    const ids = new Map<string, Existing>([
      ['guardians:+201000000001', { targetId: 'g-2', hash: 'x' }],
    ]);
    const row = { id: 's-1', name: 'ليلى', age: 8, level: null, guardian_id: 'g-1' };
    expect(fieldChanges({ item: it1, row, ids }).map((c) => [c.field, c.from, c.to])).toEqual([
      ['age', 8, 9],
      ['guardian_id', 'g-1', 'g-2'],
    ]);
  });
  it('names refs to records this plan creates', () => {
    const it1 = item({ key: S, record: { columns: {}, refs: { guardian_id: G } } });
    const [c] = fieldChanges({ item: it1, row: { guardian_id: 'g-1' }, ids: new Map() });
    expect(c?.to).toBe('new guardians:+201000000001');
  });
});

describe('loadChanges', () => {
  const mods: EntityModule[] = [
    { entity: 'students', table: 'students', map: () => [] },
    { entity: 'report_pdfs', table: 'storage.objects', map: () => [] },
  ];
  it('reads only tables with updates, by id, and skips storage', async () => {
    const asked: string[] = [];
    const f = fakeDb({
      select: (text, params) => {
        asked.push(`${text.includes('"public"."students"')} ${JSON.stringify(params)}`);
        return [{ id: 's-1', row: { id: 's-1', age: 8 } }];
      },
    });
    const items = [
      item({ key: S, record: { columns: { age: 9 }, refs: {} } }),
      item({ key: keys.student({ guardianPhone: G.key, name: 'x' }), action: 'skip' }),
      item({ key: keys.reportPdf('r'), targetId: null }),
    ];
    const out = await loadChanges({ db: f.db, items, modules: mods, existing: new Map() });
    expect(asked).toEqual(['true [["s-1"]]']);
    expect(out).toMatchObject([{ entity: 'students', field: 'age', from: 8, to: 9 }]);
  });
});
