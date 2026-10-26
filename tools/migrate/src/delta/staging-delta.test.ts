// The staging command end to end on a fake DB: dry-run --creates-only --from … --only <people +
// schedule>. Orphaned people come back, history stays, every created rule / lesson gets an
// import item (Google sync exclusion), nothing is messaged, and a second run writes nothing.
import { describe, expect, it } from 'vitest';
import type { EntityModule } from '../entities/contract.ts';
import { keyId } from '../keys.ts';
import { APPLY_ORDER, type Existing } from '../types.ts';
import { applyPlan } from '../plan/apply.ts';
import type { PlanWithChanges } from '../plan/changes.ts';
import { diffPlan, countPlan } from '../plan/diff.ts';
import { fakeDb } from '../plan/fake-db.ts';
import { onlyEntities } from './only.ts';
import { dropOrphans } from './orphans.ts';
import { recreatedCounts, runScope } from './scope.ts';
import { DESIRED, STAGING_ONLY, ledger } from './staging-delta.fixture.ts';
import { deltaPlan } from '../plan/stale-refs.ts';

const MODULES: EntityModule[] = APPLY_ORDER.map((entity) => ({
  entity,
  table: entity,
  map: () => [],
}));
const tableOf = (e: string) => e;

/** Target rows that exist: ids found by any `id::text = any($1)` read; NOT NULL columns. */
function target(alive: Set<string>) {
  return fakeDb({
    select: (text, params) =>
      text.includes('information_schema')
        ? [
            { t: 'lesson_students', c: 'lesson_id' },
            { t: 'students', c: 'guardian_id' },
          ]
        : ((params[0] as string[]) ?? []).filter((id) => alive.has(id)).map((id) => ({ id })),
  });
}

async function plan(existing: Map<string, Existing>, alive: Set<string>) {
  const scope = runScope(
    { from: '2026-10-26', only: STAGING_ONLY, createsOnly: true },
    '2026-10-26',
  );
  const fake = target(alive);
  const recreate = scope.build.recreate;
  if (!recreate || !scope.only) throw new Error('scope');
  const gone = await dropOrphans({
    db: fake.db,
    existing,
    desired: DESIRED,
    scope: { ...recreate, tableOf },
  });
  const diff = diffPlan({ desired: DESIRED, existing });
  const base = { target: 'staging', createdAt: '', ...diff, changes: [] };
  const built = { plan: { ...base, counts: countPlan(diff) } as PlanWithChanges, existing };
  const delta = await deltaPlan({ db: fake.db, built, modules: MODULES });
  return { plan: onlyEntities(delta, scope.only), gone, fake };
}

const actions = (p: PlanWithChanges) =>
  Object.fromEntries(p.items.map((i) => [keyId(i.key), i.action]));

describe('staging delta: --creates-only --from --only', () => {
  it('recreates orphaned people, adds upcoming bookings, leaves history and other entities', async () => {
    const { plan: p, gone } = await plan(ledger(), new Set(['teacher-1']));
    const a = Object.values(actions(p));
    const by = (prefix: string) =>
      p.items.filter((i) => keyId(i.key).startsWith(prefix)).map((i) => i.action);
    expect(by('teachers:')).toEqual(['skip']);
    expect(by('guardians:')).toEqual(['create']);
    expect(by('students:')).toEqual(['create']);
    expect(by('schedule_rules:')).toEqual(['create']);
    expect(by('schedule_rule_students:')).toEqual(['create']);
    expect(by('lessons:')).toEqual(['skip', 'create']); // past report lesson untouched
    expect(by('lesson_students:')).toEqual(['skip', 'create']);
    expect(by('leads:')).toEqual(['skip']); // orphaned, but not in --only
    expect(by('lesson_reports:')).toEqual(['skip']);
    expect(by('messages:')).toEqual(['skip']);
    expect(a).not.toContain('update');
    expect(recreatedCounts(p, gone)).toEqual({ guardians: 1, students: 1 });
    expect(p.issues.every((i) => STAGING_ONLY.split(',').includes(i.entity))).toBe(true);
  });

  it('apply records an import item for every created rule and lesson; no message is written', async () => {
    const existing = ledger();
    const { plan: p, fake } = await plan(existing, new Set(['teacher-1']));
    await applyPlan({
      db: fake.db,
      plan: p,
      existing,
      modules: MODULES,
      sources: {},
      gitSha: null,
    });
    const created = p.items.filter((i) => i.action === 'create').map((i) => keyId(i.key));
    const recorded = fake.items.map((i) => `${i.entity}:${i.naturalKey}`);
    expect(recorded.sort()).toEqual([...created].sort());
    expect(recorded.filter((k) => /^(lessons|schedule_rules):/.test(k))).toHaveLength(2);
    expect(
      fake.log.filter((l) => /insert (messages|leads|lesson_reports|payments)/.test(l)),
    ).toEqual([]);

    // Second run over the repointed ledger: nothing to write.
    const next = ledger();
    for (const i of fake.items)
      next.set(`${i.entity}:${i.naturalKey}`, { targetId: i.targetId, hash: i.payloadHash });
    const alive = new Set([...next.values()].flatMap((e) => (e.targetId ? [e.targetId] : [])));
    [
      'guardian-gone',
      'student-gone',
      'lead-gone',
      'lesson-gone',
      'report-gone',
      'message-gone',
    ].forEach((id) => alive.delete(id));
    const again = await plan(next, alive);
    expect(again.plan.items.filter((i) => i.action !== 'skip')).toEqual([]);
  });
});
