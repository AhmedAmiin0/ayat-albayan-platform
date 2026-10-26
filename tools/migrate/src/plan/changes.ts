// Field-level diff for planned updates: what each `update` would change in the target row.
// Read-only (SELECT by id). Lands in out/plan.json and the `changes` review sheet, never report.md.
import type { EntityModule } from '../entities/contract.ts';
import { tableIdent } from '../db/sql.ts';
import type { TargetDb } from '../db/target.ts';
import { stableJson } from '../hash.ts';
import { keyId } from '../keys.ts';
import type { EntityName, Existing, Plan, PlanItem, SourceRef } from '../types.ts';

export interface FieldChange {
  entity: EntityName;
  key: string;
  ref: SourceRef;
  field: string;
  from: unknown;
  to: unknown;
}

/** The plan as dry-run/apply write it: Plan + field-level changes of every update. */
export type PlanWithChanges = Plan & { changes: FieldChange[] };

const TIME = /^\d{2}:\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Compare as Postgres stores it: '' = null, 'HH:mm' = 'HH:mm:00', instants by epoch, 5 = '5'. */
function norm(v: unknown): unknown {
  if (v === undefined || v === '') return null;
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return v;
  if (TIME.test(v)) return `${v}:00`;
  const t = INSTANT.test(v) ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? v : t;
}

export function sameValue(a: unknown, b: unknown): boolean {
  return stableJson(norm(a)) === stableJson(norm(b));
}

interface FieldChangesInput {
  item: PlanItem;
  /** The target row as to_jsonb. */
  row: Readonly<Record<string, unknown>>;
  /** keyId → target id, for refs; refs to records created by this plan show as 'new <key>'. */
  ids: ReadonlyMap<string, Existing>;
}

export function fieldChanges(input: FieldChangesInput): FieldChange[] {
  const { item, row } = input;
  const want: Record<string, unknown> = { ...item.record.columns };
  for (const [col, nk] of Object.entries(item.record.refs)) {
    want[col] = input.ids.get(keyId(nk))?.targetId ?? `new ${keyId(nk)}`;
  }
  return Object.entries(want)
    .filter(([field, to]) => !sameValue(row[field], to))
    .map(([field, to]) => ({
      entity: item.key.entity,
      key: item.key.key,
      ref: item.ref,
      field,
      from: row[field] ?? null,
      to,
    }));
}

interface LoadChangesInput {
  db: TargetDb;
  items: readonly PlanItem[];
  modules: readonly EntityModule[];
  existing: ReadonlyMap<string, Existing>;
}

/** One SELECT per table with updates. Storage-backed and id-less (link) records are skipped. */
export async function loadChanges(input: LoadChangesInput): Promise<FieldChange[]> {
  const out: FieldChange[] = [];
  for (const mod of input.modules) {
    if (mod.table.includes('.')) continue;
    const updates = input.items.filter(
      (i) => i.key.entity === mod.entity && i.action === 'update' && i.targetId,
    );
    if (updates.length === 0) continue;
    const rows = await input.db.select<{ id: string; row: Record<string, unknown> }>({
      text: `select t.id::text as id, to_jsonb(t) as row from ${tableIdent(mod.table)} t where t.id::text = any($1)`,
      params: [updates.map((i) => i.targetId)],
    });
    const byId = new Map(rows.map((r) => [r.id, r.row]));
    for (const item of updates) {
      const row = byId.get(item.targetId ?? '');
      if (row) out.push(...fieldChanges({ item, row, ids: input.existing }));
    }
  }
  return out;
}
