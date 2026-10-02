// applyPlan: one transaction per batch, re-runs as no-ops, PDF precheck. In-memory target.
import { describe, expect, it } from 'vitest';
import type { EntityModule } from '../entities/contract.ts';
import { keys } from '../keys.ts';
import type { Plan, PlanItem } from '../types.ts';
import { applyPlan, batches } from './apply.ts';
import { fakeDb } from './fake-db.ts';

const lead = (n: number, o: Partial<PlanItem> = {}): PlanItem => ({
  key: keys.lead(`+20100000000${n}`),
  action: 'create',
  targetId: null,
  hash: `h${n}`,
  record: { columns: { n }, refs: {} },
  ref: { source: 'CRM', tab: 'contacts', row: 0 },
  ...o,
});
const plan = (items: PlanItem[]): Plan => ({
  target: 'local',
  createdAt: 'now',
  items,
  issues: [],
  counts: {},
});
const mods = (failOn?: number): EntityModule[] => [
  {
    entity: 'leads',
    table: 'leads',
    map: () => [],
    write: async (ctx) => {
      if (ctx.item.record.columns['n'] === failOn) throw new Error('boom');
      return { targetId: await ctx.tx.insert({ table: 'leads', columns: ctx.columns }) };
    },
  },
];
const run = (o: { items: PlanItem[]; failOn?: number; db: ReturnType<typeof fakeDb> }) =>
  applyPlan({
    db: o.db.db,
    plan: plan(o.items),
    existing: new Map(),
    modules: mods(o.failOn),
    sources: {},
    gitSha: null,
    batchSize: 2,
  });

describe('batches', () => {
  it('chunks in order', () => {
    expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batches([], 2)).toEqual([]);
  });
});

describe('applyPlan batches', () => {
  it('commits each batch in its own transaction', async () => {
    const f = fakeDb();
    await run({ db: f, items: [1, 2, 3, 4, 5].map((n) => lead(n)) });
    expect(f.commits).toEqual([2, 2, 1]);
    expect(f.items.map((i) => i.naturalKey)).toHaveLength(5);
  });

  it('keeps committed batches when a later one fails, and marks the run failed', async () => {
    const f = fakeDb();
    await expect(
      run({ db: f, items: [1, 2, 3, 4].map((n) => lead(n)), failOn: 4 }),
    ).rejects.toThrow('boom');
    expect(f.commits).toEqual([2]);
    expect(f.items.map((i) => i.naturalKey)).toEqual(['+201000000001', '+201000000002']);
    expect(f.runs).toEqual([{ ok: false, error: 'Error: boom' }]);
  });

  it('writes nothing when every item is unchanged (re-run)', async () => {
    const f = fakeDb();
    await run({ db: f, items: [lead(1, { action: 'skip', targetId: 'l-1' })] });
    expect(f.commits).toEqual([]);
    expect(f.log).toEqual([]);
    expect(f.runs).toEqual([{ ok: true, error: undefined }]);
  });

  it('refuses a plan with PDFs to copy before starting a run when Storage is missing', async () => {
    const f = fakeDb();
    const pdf: PlanItem = { ...lead(1), key: keys.reportPdf('l|s') };
    await expect(
      applyPlan({
        db: f.db,
        plan: plan([pdf]),
        existing: new Map(),
        modules: [],
        sources: {},
        gitSha: null,
      }),
    ).rejects.toThrow(/Storage/);
    expect(f.runs).toEqual([]);
  });
});
