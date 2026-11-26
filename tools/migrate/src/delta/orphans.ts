// --creates-only --only …: an import item whose target row is gone (the owner emptied staging's
// people and schedule on 2026-10-15) no longer counts as imported. The record is planned as a
// create again (adoption by phone / name still runs first) and apply repoints its import item
// (upsert on entity + natural key). Only the entities named in --only, never a lesson starting
// before --from; past lessons, reports, leads and messages in the ledger stay untouched.
import { tableIdent } from '../db/sql.ts';
import type { TargetDb } from '../db/target.ts';
import { keyId } from '../keys.ts';
import type { EntityName, Existing } from '../types.ts';
import type { Desired } from '../plan/resolve.ts';

export interface RecreateScope {
  only: ReadonlySet<EntityName>;
  /** UTC ISO of --from 00:00 Asia/Riyadh: no lesson starting earlier is recreated. */
  fromUtc: string;
  tableOf: (entity: EntityName) => string;
}

/** A lesson (or any other record) the scope lets come back. */
function recreatable(d: Desired, scope: RecreateScope): boolean {
  if (!scope.only.has(d.key.entity) || scope.tableOf(d.key.entity).includes('.')) return false;
  if (d.key.entity !== 'lessons') return true;
  const start = d.record.columns.starts_at;
  return typeof start === 'string' && Date.parse(start) >= Date.parse(scope.fromUtc);
}

interface OrphanQuery {
  db: Pick<TargetDb, 'select'>;
  existing: ReadonlyMap<string, Existing>;
  desired: readonly Desired[];
  scope: RecreateScope;
}

/** Per table: target id → keyId of each recreatable record the ledger says was imported. */
function importedByTable(o: OrphanQuery): Map<string, Map<string, string>> {
  const byTable = new Map<string, Map<string, string>>();
  for (const d of o.desired) {
    const id = o.existing.get(keyId(d.key))?.targetId;
    if (!id || !recreatable(d, o.scope)) continue;
    const table = o.scope.tableOf(d.key.entity);
    byTable.set(table, (byTable.get(table) ?? new Map<string, string>()).set(id, keyId(d.key)));
  }
  return byTable;
}

/** The keyIds among `ids` whose target row is not in `table`. */
async function missingIn(
  db: OrphanQuery['db'],
  table: string,
  ids: ReadonlyMap<string, string>,
): Promise<string[]> {
  const rows = await db.select<{ id: string }>({
    text: `select id::text as id from ${tableIdent(table)} where id::text = any($1)`,
    params: [[...ids.keys()]],
  });
  const found = new Set(rows.map((r) => r.id));
  return [...ids].filter(([id]) => !found.has(id)).map(([, key]) => key);
}

/** Which import items of recreatable records name a row the target no longer has. Reads only. */
async function goneRows(o: OrphanQuery): Promise<Set<string>> {
  const gone = new Set<string>();
  for (const [table, ids] of importedByTable(o)) {
    for (const key of await missingIn(o.db, table, ids)) gone.add(key);
  }
  return gone;
}

/** A link row (no target id) in scope that names a gone parent. */
function followsGoneParent(d: Desired, o: OrphanQuery, gone: ReadonlySet<string>): boolean {
  const isLink = o.existing.get(keyId(d.key))?.targetId === null;
  const parentGone = Object.values(d.record.refs).some((nk) => gone.has(keyId(nk)));
  return isLink && o.scope.only.has(d.key.entity) && parentGone;
}

/**
 * Drops orphaned import items from `existing` (mutates it) and returns their keyIds. Link rows
 * (no target id) follow a recreated parent; one that also names a gone row that is not recreated
 * (a past lesson) is then skipped by deltaPlan's stale-ref check, never inserted.
 */
export async function dropOrphans(
  o: OrphanQuery & { existing: Map<string, Existing> },
): Promise<Set<string>> {
  const gone = await goneRows(o);
  for (const d of o.desired) {
    if (followsGoneParent(d, o, gone)) gone.add(keyId(d.key));
  }
  for (const id of gone) o.existing.delete(id);
  return gone;
}
