// Pure SQL text builders for the target adapter. Identifiers are whitelisted, values are params.
import type { ColumnValue, EntityName, SourceRef } from '../types.ts';

/**
 * Values bind as they are: postgres.js serialises each one by the parameter type the server
 * describes, so a jsonb object or array goes out as JSON and a text[] array as a Postgres array.
 * Never pre-stringify JSON: JSON text bound to a jsonb parameter is stored as a jsonb *string*.
 */
export type Param = ColumnValue;

export interface SqlText {
  text: string;
  params: Param[];
}

const IDENT = /^[a-z_][a-z0-9_]*$/;

export function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Bad SQL identifier: ${name}`);
  return `"${name}"`;
}

/** Table names may be schema-qualified: 'storage.objects'. Unqualified → public. */
export function tableIdent(name: string): string {
  const parts = name.split('.');
  return (parts.length === 1 ? ['public', ...parts] : parts).map(ident).join('.');
}


export interface InsertSpec {
  table: string;
  columns: Record<string, ColumnValue>;
  /** students.code_seq is GENERATED ALWAYS: legacy AB-nnnn codes need OVERRIDING SYSTEM VALUE. */
  overridingSystemValue?: boolean;
  /** 'id' (default) or null for link tables without an id column (then ON CONFLICT DO NOTHING). */
  returning?: 'id' | null;
  /** 'nothing': ON CONFLICT DO NOTHING RETURNING id — a conflict returns no row instead of failing. */
  onConflict?: 'nothing';
}

export function insertSql(spec: InsertSpec): SqlText {
  const names = Object.keys(spec.columns);
  if (names.length === 0) throw new Error(`insert into ${spec.table} without columns`);
  const cols = names.map(ident).join(', ');
  const values = names.map((_, i) => `$${i + 1}`).join(', ');
  const overriding = spec.overridingSystemValue ? ' overriding system value' : '';
  const skip = spec.returning === null || spec.onConflict === 'nothing';
  const tail = `${skip ? ' on conflict do nothing' : ''}${spec.returning === null ? '' : ' returning id'}`;
  return {
    text: `insert into ${tableIdent(spec.table)} (${cols})${overriding} values (${values})${tail}`,
    params: names.map((n) => spec.columns[n] ?? null),
  };
}

export function updateSql(spec: {
  table: string;
  id: string;
  columns: Record<string, ColumnValue>;
}): SqlText {
  const names = Object.keys(spec.columns);
  if (names.length === 0) throw new Error(`update ${spec.table} without columns`);
  const sets = names.map((n, i) => `${ident(n)} = $${i + 1}`).join(', ');
  return {
    text: `update ${tableIdent(spec.table)} set ${sets} where "id" = $${names.length + 1}`,
    params: [...names.map((n) => spec.columns[n] ?? null), spec.id],
  };
}

/** id + matched column for rows whose `column` is in `values` (adopting app-created rows). */
export function findByColumnSql(q: {
  table: string;
  column: string;
  values: readonly string[];
}): SqlText {
  return {
    text: `select "id"::text as id, ${ident(q.column)}::text as value from ${tableIdent(q.table)} where ${ident(q.column)}::text = any($1)`,
    params: [q.values],
  };
}

export interface ImportItemWrite {
  entity: EntityName;
  naturalKey: string;
  targetTable: string;
  targetId: string | null;
  targetPath?: string | null;
  payloadHash: string;
  sourceRef: SourceRef;
  runId: string;
}

/** Upsert on (entity, natural_key): first_run_id stays, last_run_id / hash / target move. */
export function recordItemSql(i: ImportItemWrite): SqlText {
  return {
    text: `insert into public.import_items (entity, natural_key, target_table, target_id, target_path,
      payload_hash, source_ref, first_run_id, last_run_id) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8)
      on conflict (entity, natural_key) do update set target_id = excluded.target_id,
      target_path = excluded.target_path, payload_hash = excluded.payload_hash,
      source_ref = excluded.source_ref, last_run_id = excluded.last_run_id`,
    params: [
      i.entity,
      i.naturalKey,
      i.targetTable,
      i.targetId,
      i.targetPath ?? null,
      i.payloadHash,
      { ...i.sourceRef },
      i.runId,
    ],
  };
}
