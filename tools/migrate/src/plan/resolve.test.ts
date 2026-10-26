// resolve(): exact-key merges and look-alike detection, on invented rows.
import { describe, expect, it } from 'vitest';
import { keys } from '../keys.ts';
import type { Mapped, NaturalKey, TargetRecord } from '../types.ts';
import { mergeRecords, resolve } from './resolve.ts';
import { samePhoneTeachers, similarStudents, splitStudentKey } from './match/similar.ts';

const ref = (row: number) => ({ source: 'HUB' as const, tab: 't', row });
const rec = (columns: TargetRecord['columns'], refs: TargetRecord['refs'] = {}): TargetRecord => ({
  columns,
  refs,
});
const ok = (key: NaturalKey, value: TargetRecord, row: number): Mapped => ({
  ok: true,
  key,
  value,
  ref: ref(row),
  issues: [],
});
const G1 = keys.guardian('+201000000001');
const G2 = keys.guardian('+201000000002');
const student = (name: string, g = G1) => keys.student({ guardianPhone: g.key, name });

describe('mergeRecords', () => {
  it('fills blanks from either side', () => {
    expect(mergeRecords(rec({ a: 1, b: null }), rec({ b: 'x', c: '' }, { g: G1 }))).toEqual(
      rec({ a: 1, b: 'x', c: '' }, { g: G1 }),
    );
  });
  it('refuses real disagreements in columns or refs', () => {
    expect(mergeRecords(rec({ a: 1 }), rec({ a: 2 }))).toBeUndefined();
    expect(mergeRecords(rec({}, { g: G1 }), rec({}, { g: G2 }))).toBeUndefined();
  });
});

describe('resolve: exact key', () => {
  it('merges compatible rows into one record and says so', () => {
    const S = student('ليلى');
    const r = resolve([ok(S, rec({ age: 9, level: null }), 2), ok(S, rec({ level: 'جزء عم' }), 7)]);
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0]?.record.columns).toEqual({ age: 9, level: 'جزء عم' });
    expect(r.kept[0]?.ref.row).toBe(2);
    expect(r.issues).toMatchObject([
      { code: 'duplicate', severity: 'warn', ref: { row: 7 }, detail: 'merged into t row 2' },
    ]);
  });
  it('re-hashes the merged record (stable across runs)', () => {
    const S = student('ليلى');
    const rows = [ok(S, rec({ age: 9 }), 2), ok(S, rec({ level: 'x' }), 3)];
    expect(resolve(rows).kept[0]?.hash).toBe(resolve(rows).kept[0]?.hash);
    expect(resolve(rows).kept[0]?.hash).not.toBe(resolve([rows[0] as Mapped]).kept[0]?.hash);
  });
});

describe('similarStudents (A1)', () => {
  const d = (name: string, row: number, g = G1) =>
    resolve([ok(student(name, g), rec({ name }, { guardian_id: g }), row)]).kept;

  it('flags similar names under one guardian, keeps both', () => {
    const all = [...d('هالة', 2), ...d('هاله محمد', 3), ...d('تالا', 4)];
    const issues = similarStudents(all);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: 'merge_candidate',
      severity: 'review',
      entity: 'students',
      ref: { row: 3 },
    });
    expect(issues[0]?.detail).toContain('row 2');
  });
  it('ignores similar names under different guardians', () => {
    expect(similarStudents([...d('هالة', 2), ...d('هالة', 3, G2)])).toEqual([]);
  });
  it('splits student keys on the first bar', () => {
    expect(splitStudentKey('+201|ام ليلى')).toEqual(['+201', 'ام ليلى']);
    expect(splitStudentKey('x')).toEqual(['', 'x']);
  });
});

describe('samePhoneTeachers', () => {
  it('sends two slugs sharing a phone to review', () => {
    const t = (slug: string, row: number, phone: string | null) =>
      resolve([ok(keys.teacher(slug), rec({ phone_e164: phone }), row)]).kept;
    const all = [...t('abrar', 2, '+201'), ...t('abrar salem', 3, '+201'), ...t('hend', 4, null)];
    expect(samePhoneTeachers(all)).toMatchObject([
      { code: 'conflict', entity: 'teachers', ref: { row: 3 }, field: 'phone_e164' },
    ]);
  });
});
