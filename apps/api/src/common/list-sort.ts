import type { ListSort } from '@ab/shared';

// Server-side sort + text filter for paginated lists (R-NFR-08). The client sends an allowlisted
// key (`listSortShape`), never a column name; the spec maps it to the column.

export interface SortColumn {
  column: string;
  /** Embedded resource of a `select('…, teacher:teachers(name)')` (PostgREST `referencedTable`). */
  referencedTable?: string;
  nullsFirst?: boolean;
}

export interface SortSpec<K extends string> {
  columns: Record<K, SortColumn>;
  /** The default order, and the tiebreaker after a requested key so paging is stable. */
  fallback: { column: string; ascending: boolean };
}

type OrderOptions = { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string };

/** The one builder method we need: supabase-js query builders fit, and so does a test fake. */
export interface Orderable<T> {
  order(column: string, options?: OrderOptions): T;
}

/** `.order()` for the requested key (asc unless `dir: 'desc'`), then the fallback; no key → fallback. */
export function applySort<K extends string, T extends Orderable<T>>(query: T, sort: ListSort<K>, spec: SortSpec<K>): T {
  const { fallback } = spec;
  const picked = sort.sort === undefined ? undefined : spec.columns[sort.sort];
  if (!picked) return query.order(fallback.column, { ascending: fallback.ascending });
  const options: OrderOptions = { ascending: sort.dir !== 'desc' };
  if (picked.nullsFirst !== undefined) options.nullsFirst = picked.nullsFirst;
  if (picked.referencedTable) options.referencedTable = picked.referencedTable;
  const ordered = query.order(picked.column, options);
  if (picked.column === fallback.column && !picked.referencedTable) return ordered;
  return ordered.order(fallback.column, { ascending: fallback.ascending });
}

/**
 * `%term%` for `.ilike(column, …)`, with LIKE wildcards (and `\`, `,`) escaped so they match
 * literally. Not for `.or('a.ilike.*x*')` strings: those use guardians/http `orSafe`.
 */
export function ilikeContains(value: string): string {
  return `%${value.trim().replace(/[\\%_,]/g, (c) => `\\${c}`)}%`;
}
