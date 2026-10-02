// resolve + diffPlan on invented records.
import { describe, expect, it } from 'vitest';
import { keys } from '../keys.ts';
import type { Mapped, SourceRef, TargetRecord } from '../types.ts';
import { countPlan, diffPlan } from './diff.ts';
import { resolve } from './resolve.ts';

const ref = (row: number): SourceRef => ({ source: 'HUB', tab: 't', row });
const rec = (columns: TargetRecord['columns'], refs: TargetRecord['refs'] = {}): TargetRecord => ({
  columns,
  refs,
});
const ok = (key: ReturnType<typeof keys.lead>, value: TargetRecord, row: number): Mapped => ({
  ok: true,
  key,
  value,
  ref: ref(row),
  issues: [],
});
const G = keys.guardian('+201000000001');
const S = keys.student({ guardianPhone: '+201000000001', name: 'ليلى' });

describe('resolve', () => {
  it('keeps the first of exact duplicates and warns (A7)', () => {
    const r = resolve([ok(G, rec({ name: 'a' }), 2), ok(G, rec({ name: 'a' }), 3)]);
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0]?.ref.row).toBe(2);
    expect(r.issues).toMatchObject([{ code: 'duplicate', severity: 'warn', ref: { row: 3 } }]);
  });

  it('flags conflicts for review; prefer last keeps the latest (B1)', () => {
    const rows = [ok(G, rec({ name: 'a' }), 2), ok(G, rec({ name: 'b' }), 3)];
    expect(resolve(rows).kept[0]?.record.columns['name']).toBe('a');
    const last = resolve(rows, { prefer: 'last' });
    expect(last.kept[0]?.record.columns['name']).toBe('b');
    expect(last.issues).toMatchObject([{ code: 'conflict', severity: 'review', ref: { row: 2 } }]);
  });

  it('passes rejected rows and row issues through', () => {
    const issue = {
      code: 'test_row' as const,
      severity: 'reject' as const,
      entity: 'guardians' as const,
      ref: ref(9),
    };
    const r = resolve([{ ok: false, ref: ref(9), issues: [issue] }]);
    expect(r.kept).toEqual([]);
    expect(r.issues).toEqual([issue]);
  });
});

describe('diffPlan', () => {
  const guardian = resolve([ok(G, rec({ name: 'a' }), 2)]).kept;
  const student = resolve([ok(S, rec({ name: 'ليلى' }, { guardian_id: G }), 3)]).kept;

  it('creates in dependency order whatever the input order', () => {
    const r = diffPlan({ desired: [...student, ...guardian], existing: new Map() });
    expect(r.items.map((i) => [i.key.entity, i.action])).toEqual([
      ['guardians', 'create'],
      ['students', 'create'],
    ]);
    expect(countPlan(r)).toMatchObject({ guardians: { create: 1 }, students: { create: 1 } });
  });

  it('skips unchanged, updates changed, adopts app-created rows', () => {
    const h = guardian[0]?.hash ?? '';
    const same = diffPlan({
      desired: guardian,
      existing: new Map([['guardians:+201000000001', { targetId: 'g1', hash: h }]]),
    });
    expect(same.items[0]).toMatchObject({ action: 'skip', targetId: 'g1' });
    const changed = diffPlan({
      desired: guardian,
      existing: new Map([['guardians:+201000000001', { targetId: 'g1', hash: 'old' }]]),
    });
    expect(changed.items[0]?.action).toBe('update');
    const adopted = diffPlan({
      desired: guardian,
      existing: new Map([['guardians:+201000000001', { targetId: 'g1', hash: null }]]),
    });
    expect(adopted.items[0]?.action).toBe('adopt');
  });

  it('accepts a ref that only exists in the target', () => {
    const r = diffPlan({
      desired: student,
      existing: new Map([['guardians:+201000000001', { targetId: 'g1', hash: 'x' }]]),
    });
    expect(r.items[0]?.action).toBe('create');
  });

  it('rejects dangling refs and everything built on them', () => {
    const L = keys.lessonStudent({ lesson: 'l', student: S.key });
    const link = resolve([ok(L, rec({}, { student_id: S }), 4)]).kept;
    const r = diffPlan({ desired: [...student, ...link], existing: new Map() });
    expect(r.items).toEqual([]);
    expect(r.issues.map((i) => [i.entity, i.code, i.field])).toEqual([
      ['students', 'missing_ref', 'guardian_id'],
      ['lesson_students', 'missing_ref', 'student_id'],
    ]);
    expect(countPlan(r)).toMatchObject({ students: { reject: 1 }, lesson_students: { reject: 1 } });
  });

  it('refuses unresolved duplicates', () => {
    expect(() => diffPlan({ desired: [...guardian, ...guardian], existing: new Map() })).toThrow(
      /resolve/,
    );
  });
});
