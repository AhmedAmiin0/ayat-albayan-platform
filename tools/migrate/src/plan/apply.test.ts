// applyPlan against an in-memory fake TargetDb (no database).
import { describe, expect, it } from 'vitest';
import type { EntityModule } from '../entities/contract.ts';
import type { ImportItemWrite, TargetDb, TargetTx } from '../db/target.ts';
import { keys } from '../keys.ts';
import type { Plan, PlanItem } from '../types.ts';
import { applyPlan, resolveRefs } from './apply.ts';

const G = keys.guardian('+201000000001');
const S = keys.student({ guardianPhone: '+201000000001', name: 'ليلى' });
const item = (o: Partial<PlanItem> & Pick<PlanItem, 'key'>): PlanItem => ({
  action: 'create',
  targetId: null,
  hash: 'h',
  record: { columns: {}, refs: {} },
  ref: { source: 'HUB', tab: 't', row: 2 },
  ...o,
});

function fakeDb(failOn?: string) {
  const log: string[] = [];
  const items: ImportItemWrite[] = [];
  let n = 0;
  const tx: TargetTx = {
    insert: async (s) => {
      if (s.table === failOn) throw new Error('boom');
      log.push(`insert ${s.table} ${JSON.stringify(s.columns)}`);
      return `${s.table}-${++n}`;
    },
    update: async (s) => void log.push(`update ${s.table} ${s.id}`),
    recordItem: async (i) => void items.push(i),
    exec: async () => undefined,
  };
  const runs: { ok: boolean; error?: string }[] = [];
  const db: TargetDb = {
    name: 'local',
    loadImportItems: async () => new Map(),
    findByColumn: async () => new Map(),
    ...{ lockApply: async () => undefined, startRun: async () => 'run-1' },
    finishRun: async (o) => void runs.push({ ok: o.ok, error: o.error }),
    transaction: (fn) => fn(tx),
    select: async () => [],
    close: async () => undefined,
  };
  return { db, log, items, runs };
}

const mods: EntityModule[] = [
  { entity: 'guardians', table: 'guardians', map: () => [] },
  { entity: 'students', table: 'students', map: () => [] },
];
const plan = (items: PlanItem[]): Plan => ({
  target: 'local',
  createdAt: 'now',
  items,
  issues: [],
  counts: {},
});

describe('applyPlan', () => {
  it('creates parents first and resolves refs to the new ids', async () => {
    const f = fakeDb();
    const p = plan([
      item({ key: S, record: { columns: { name: 'ليلى' }, refs: { guardian_id: G } } }),
      item({ key: G, record: { columns: { name: 'g' }, refs: {} } }),
    ]);
    await applyPlan({
      db: f.db,
      plan: p,
      existing: new Map(),
      modules: mods,
      sources: {},
      gitSha: null,
    });
    expect(f.log).toEqual([
      'insert guardians {"name":"g"}',
      'insert students {"name":"ليلى","guardian_id":"guardians-1"}',
    ]);
    expect(f.items.map((i) => [i.entity, i.targetId, i.runId])).toEqual([
      ['guardians', 'guardians-1', 'run-1'],
      ['students', 'students-2', 'run-1'],
    ]);
    expect(f.runs).toEqual([{ ok: true, error: undefined }]);
  });

  it('updates by id, records adoptions without writing, ignores skips', async () => {
    const f = fakeDb();
    const p = plan([
      item({ key: G, action: 'adopt', targetId: 'g-app' }),
      item({
        key: S,
        action: 'update',
        targetId: 's-1',
        record: { columns: {}, refs: { guardian_id: G } },
      }),
      item({ key: keys.guardian('+201000000002'), action: 'skip', targetId: 'g-2' }),
    ]);
    await applyPlan({
      db: f.db,
      plan: p,
      existing: new Map(),
      modules: mods,
      sources: {},
      gitSha: 'abc',
    });
    expect(f.log).toEqual(['update students s-1']);
    expect(f.items.map((i) => i.targetId)).toEqual(['g-app', 's-1']);
  });

  it('marks the run failed and rethrows', async () => {
    const f = fakeDb('guardians');
    await expect(
      applyPlan({
        db: f.db,
        plan: plan([item({ key: G })]),
        existing: new Map(),
        modules: mods,
        sources: {},
        gitSha: null,
      }),
    ).rejects.toThrow('boom');
    expect(f.runs[0]?.ok).toBe(false);
  });

  it('needs a module for every planned entity', async () => {
    const f = fakeDb();
    const p = plan([item({ key: keys.lead('+201000000003') })]);
    await expect(
      applyPlan({
        db: f.db,
        plan: p,
        existing: new Map(),
        modules: mods,
        sources: {},
        gitSha: null,
      }),
    ).rejects.toThrow(/No entity module for leads/);
  });
});

describe('resolveRefs', () => {
  it('uses ids of rows imported by earlier runs', () => {
    const it1 = item({ key: S, record: { columns: { a: 1 }, refs: { guardian_id: G } } });
    expect(resolveRefs(it1, new Map([['guardians:+201000000001', 'g-old']]))).toEqual({
      a: 1,
      guardian_id: 'g-old',
    });
    expect(() => resolveRefs(it1, new Map())).toThrow(/no target id/);
  });
});
