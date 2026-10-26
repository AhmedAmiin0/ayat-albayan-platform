// --creates-only into a target the team edits: a new record's ref to a row the app has since
// deleted (its import item still names the old id) is left empty, as the FK's ON DELETE SET NULL
// already left the rows that were there; a record whose stale ref is NOT NULL is skipped.
import type { EntityModule } from '../entities/contract.ts';
import { tableIdent } from '../db/sql.ts';
import type { TargetDb } from '../db/target.ts';
import { keyId } from '../keys.ts';
import type { EntityName, Existing } from '../types.ts';
import type { PlanWithChanges } from './changes.ts';
import { createsOnly } from './creates-only.ts';
import { countPlan } from './diff.ts';

interface Stale {
  /** keyIds whose import item names a row the target no longer has. */
  missing: ReadonlySet<string>;
  /** 'table.column' pairs that are NOT NULL in the target. */
  required: ReadonlySet<string>;
}

type TableOf = (entity: EntityName) => string;

/** Reads only: which refs of planned creates point at rows that are gone. */
export async function findStale(o: {
  db: Pick<TargetDb, 'select'>;
  plan: PlanWithChanges;
  existing: ReadonlyMap<string, Existing>;
  tableOf: TableOf;
}): Promise<Stale> {
  const byTable = new Map<string, Map<string, string[]>>();
  for (const item of o.plan.items) {
    if (item.action !== 'create') continue;
    for (const nk of Object.values(item.record.refs)) {
      const id = o.existing.get(keyId(nk))?.targetId;
      const table = o.tableOf(nk.entity);
      if (!id || table.includes('.')) continue;
      const ids = byTable.get(table) ?? new Map<string, string[]>();
      ids.set(id, [...(ids.get(id) ?? []), keyId(nk)]);
      byTable.set(table, ids);
    }
  }
  const missing = new Set<string>();
  for (const [table, ids] of byTable) {
    const rows = await o.db.select<{ id: string }>({
      text: `select id::text as id from ${tableIdent(table)} where id::text = any($1)`,
      params: [[...ids.keys()]],
    });
    const found = new Set(rows.map((r) => r.id));
    for (const [id, keys] of ids) if (!found.has(id)) keys.forEach((k) => missing.add(k));
  }
  const required = new Set<string>();
  if (missing.size === 0) return { missing, required };
  const cols = await o.db.select<{ t: string; c: string }>({
    text: `select table_name as t, column_name as c from information_schema.columns
           where table_schema = 'public' and is_nullable = 'NO'`,
    params: [],
  });
  for (const r of cols) required.add(`${r.t}.${r.c}`);
  return { missing, required };
}

/**
 * Pure: drop stale refs on nullable columns; skip a create whose stale ref is required.
 * ponytail: the import item keeps the planned hash, so a later full run with those rows restored
 * will not re-link these records; re-link by hand (or drop their import items) if that ever happens.
 */
export function dropStaleRefs(o: { plan: PlanWithChanges; stale: Stale; tableOf: TableOf }) {
  let cleared = 0;
  let skipped = 0;
  const items = o.plan.items.map((item) => {
    if (item.action !== 'create') return item;
    const refs = Object.entries(item.record.refs);
    const gone = refs.filter(([, nk]) => o.stale.missing.has(keyId(nk)));
    if (gone.length === 0) return item;
    const table = o.tableOf(item.key.entity);
    if (gone.some(([col]) => o.stale.required.has(`${table}.${col}`))) {
      skipped += 1;
      return { ...item, action: 'skip' as const };
    }
    cleared += gone.length;
    const kept = Object.fromEntries(refs.filter(([, nk]) => !o.stale.missing.has(keyId(nk))));
    return { ...item, record: { ...item.record, refs: kept } };
  });
  const plan = { ...o.plan, items, counts: countPlan({ items, issues: o.plan.issues }) };
  return { plan, cleared, skipped };
}

/**
 * A new lesson whose every new student link was skipped (its students were deleted in the app) is
 * skipped too: it would be a lesson with no student. Lessons with no link planned at all are kept.
 */
export function dropOrphanLessons(plan: PlanWithChanges): PlanWithChanges {
  const links = plan.items.filter((i) => i.key.entity === 'lesson_students');
  const kept = new Set<string>();
  const linked = new Set<string>();
  for (const l of links) {
    const lesson = l.record.refs['lesson_id'];
    if (!lesson) continue;
    linked.add(keyId(lesson));
    if (l.action !== 'skip') kept.add(keyId(lesson));
  }
  const orphan = (i: (typeof plan.items)[number]) =>
    i.key.entity === 'lessons' && i.action === 'create' && linked.has(keyId(i.key)) && !kept.has(keyId(i.key));
  const items = plan.items.map((i) => (orphan(i) ? { ...i, action: 'skip' as const } : i));
  return { ...plan, items, counts: countPlan({ items, issues: plan.issues }) };
}

/** --creates-only: new records only, refs to rows deleted in the app left empty. */
export async function deltaPlan(o: {
  db: Pick<TargetDb, 'select'>;
  built: { plan: PlanWithChanges; existing: ReadonlyMap<string, Existing> };
  modules: readonly EntityModule[];
}): Promise<PlanWithChanges> {
  const tableOf: TableOf = (e) => o.modules.find((m) => m.entity === e)?.table ?? e;
  const plan = createsOnly(o.built.plan);
  const stale = await findStale({ db: o.db, plan, existing: o.built.existing, tableOf });
  const r = dropStaleRefs({ plan, stale, tableOf });
  const out = dropOrphanLessons(r.plan);
  const orphans = out.counts['lessons']?.skip ?? 0;
  console.log(`creates-only: ${r.cleared} links to rows deleted in the app left empty, ${r.skipped} skipped`);
  console.log(`creates-only: lessons skipped (incl. orphans whose students are gone): ${orphans}`);
  return out;
}
