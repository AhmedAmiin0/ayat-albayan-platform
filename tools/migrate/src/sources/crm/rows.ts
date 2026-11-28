// Typed reads of cached CRM rows (PostgREST JSON, cache/crm/<table>.json) and their SourceRef.
import type { CrmRow, SourceRef } from '../../types.ts';

const SCALAR_KINDS: ReadonlySet<string> = new Set(['string', 'number', 'boolean', 'bigint']);
const isScalar = (v: unknown): boolean => SCALAR_KINDS.has(typeof v);

export type CrmTables = Readonly<Record<string, readonly CrmRow[]>>;

/** Trimmed scalar as text, or null when missing, blank or not a scalar. */
export function text(row: CrmRow, col: string): string | null {
  const v = row[col];
  if (!isScalar(v)) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** CRM rows have no sheet row: `id` is the CRM uuid (kept in import_items.source_ref). */
export function crmRef(table: string, row: CrmRow): SourceRef {
  return { source: 'CRM', tab: table, row: 0, id: text(row, 'id') ?? '' };
}

/** Rows of one extracted table, oldest first by `created_at` (code-point order; stable on ties). */
export function rowsByAge(crm: CrmTables, table: string): CrmRow[] {
  const at = (r: CrmRow): string => text(r, 'created_at') ?? '';
  return [...(crm[table] ?? [])].sort((a, b) => Number(at(a) > at(b)) - Number(at(a) < at(b)));
}
