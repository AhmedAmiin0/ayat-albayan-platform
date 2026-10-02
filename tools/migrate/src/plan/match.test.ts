// Target-side resolve on invented rows: adopt exact matches, review look-alikes, never merge.
import { describe, expect, it } from 'vitest';
import { keyId, keys } from '../keys.ts';
import type { Existing, NaturalKey, TargetRecord } from '../types.ts';
import { fakeDb } from './fake-db.ts';
import { matchStudents, matchTeachers } from './match.ts';
import { matchTarget } from './match.target.ts';
import { type Desired, resolve } from './resolve.ts';

const one = (key: NaturalKey, record: TargetRecord, row = 2): Desired[] =>
  resolve([{ ok: true, key, value: record, ref: { source: 'HUB', tab: 't', row }, issues: [] }])
    .kept;
const teacher = (slug: string, columns: TargetRecord['columns']) =>
  one(keys.teacher(slug), { columns, refs: {} });
const G = keys.guardian('+201000000001');
const student = (name: string, row = 2) =>
  one(
    keys.student({ guardianPhone: G.key, name }),
    { columns: { name }, refs: { guardian_id: G } },
    row,
  );

const TEACHERS = [
  { id: 't-1', phone_e164: '+201111111111', display_name_ar: 'أبرار' },
  { id: 't-2', phone_e164: null, display_name_ar: 'الأستاذة هند' },
];

describe('matchTeachers', () => {
  it('adopts by phone first, then by normalised Arabic name', () => {
    const fresh = [
      ...teacher('abrar', { phone_e164: '+201111111111', display_name_ar: 'أبرار سالم' }),
      ...teacher('hend', { phone_e164: '+201222222222', display_name_ar: 'هند' }),
      ...teacher('rabia', { phone_e164: null, display_name_ar: 'ربيعه' }),
    ];
    const r = matchTeachers({ fresh, rows: TEACHERS, claimed: new Set() });
    expect([...r.adopt]).toEqual([
      ['teachers:abrar', 't-1'],
      ['teachers:hend', 't-2'],
    ]);
    // By name alone (hend): listed for the owner, since every imported row will link to it.
    expect(r.issues).toMatchObject([
      { code: 'merge_candidate', severity: 'warn', entity: 'teachers', ref: { row: 2 } },
    ]);
    expect(r.issues[0]?.detail).toContain('t-2');
  });
  it('never adopts one target row twice', () => {
    const fresh = teacher('abrar', { phone_e164: '+201111111111', display_name_ar: 'x' });
    const r = matchTeachers({ fresh, rows: TEACHERS, claimed: new Set(['t-1']) });
    expect(r.adopt.size).toBe(0);
    expect(r.issues).toMatchObject([{ code: 'conflict', severity: 'review', entity: 'teachers' }]);
  });
});

describe('matchStudents', () => {
  const rows = [
    { id: 's-1', guardian_id: 'g-1', name: 'ليلى', code: 'AB-0001' },
    { id: 's-2', guardian_id: 'g-1', name: 'هالة محمد', code: 'AB-0002' },
    { id: 's-3', guardian_id: 'g-9', name: 'نورة', code: 'AB-0003' },
  ];
  const guardianIds = new Map([[keyId(G), 'g-1']]);

  it('adopts the exact name under the same guardian', () => {
    const r = matchStudents({ fresh: student('ليلي'), rows, claimed: new Set(), guardianIds });
    expect([...r.adopt.values()]).toEqual(['s-1']);
    expect(r.issues).toMatchObject([{ code: 'merge_candidate', severity: 'warn' }]);
  });
  it('queues a similar name for review and adopts nothing', () => {
    const r = matchStudents({ fresh: student('هاله'), rows, claimed: new Set(), guardianIds });
    expect(r.adopt.size).toBe(0);
    expect(r.issues).toMatchObject([
      { code: 'merge_candidate', severity: 'review', field: 'name' },
    ]);
    expect(r.issues[0]?.detail).toContain('AB-0002');
  });
  it('does not look under other guardians or new guardians', () => {
    expect(
      matchStudents({ fresh: student('نوره'), rows, claimed: new Set(), guardianIds }).issues,
    ).toEqual([]);
    const none = matchStudents({
      fresh: student('ليلى'),
      rows,
      claimed: new Set(),
      guardianIds: new Map(),
    });
    expect(none.adopt.size).toBe(0);
  });
});

describe('matchTarget', () => {
  it('adopts guardians by phone, then students under them', async () => {
    const f = fakeDb({
      select: (text) => {
        if (text.startsWith('find guardians')) return [{ id: 'g-1', value: G.key }];
        if (text.includes('from public.students'))
          return [{ id: 's-1', guardian_id: 'g-1', name: 'ليلى', code: 'AB-0001' }];
        return TEACHERS;
      },
    });
    const desired = [
      ...teacher('abrar', { phone_e164: '+201111111111', display_name_ar: 'أبرار' }),
      ...one(G, { columns: { name: 'ام ليلى' }, refs: {} }),
      ...student('ليلى'),
      ...student('هالة', 3),
    ];
    const existing = new Map<string, Existing>();
    const issues = await matchTarget({ db: f.db, desired, existing });
    expect([...existing].map(([k, e]) => [k, e.targetId, e.hash])).toEqual([
      ['teachers:abrar', 't-1', null],
      ['guardians:+201000000001', 'g-1', null],
      ['students:+201000000001|ليلي', 's-1', null],
    ]);
    expect(issues.map((i) => [i.entity, i.severity])).toEqual([['students', 'warn']]);
  });
  it('skips records import_items already maps', async () => {
    const f = fakeDb({ select: () => TEACHERS });
    const desired = teacher('abrar', { phone_e164: '+201111111111', display_name_ar: 'أبرار' });
    const existing = new Map<string, Existing>([
      ['teachers:abrar', { targetId: 't-9', hash: 'h' }],
    ]);
    await matchTarget({ db: f.db, desired, existing });
    expect(existing.get('teachers:abrar')).toEqual({ targetId: 't-9', hash: 'h' });
  });
});
