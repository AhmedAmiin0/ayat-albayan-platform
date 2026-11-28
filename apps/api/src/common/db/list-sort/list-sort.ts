import type { ListSort } from '@ab/core';

// Server-side sort + text filter for paginated lists (R-NFR-08). The client sends an allowlisted
// key (`listSortShape`), never a column name; the spec maps it to the column.

export interface SortColumn {
  column: string;
  /** Embedded resource of a `select('…, teacher:teachers(name)')` (PostgREST `referencedTable`). */
  referencedTable?: string;
  nullsFirst?: boolean;
}

export interface SortOrder {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

export interface SortSpec<K extends string> {
  columns: Record<K, SortColumn>;
  /** The default order, and the tiebreakers after a requested key unless `tiebreak` is set. */
  fallback: readonly SortOrder[];
  /** The tiebreakers after a requested key, when they differ from the default order. */
  tiebreak?: readonly SortOrder[];
  /** A unique column ordered last so ties never move between pages; `id` by default. */
  key?: string;
}

interface OrderOptions { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string }

/** The one builder method we need: supabase-js query builders fit, and so does a test fake. */
export interface Orderable<T> {
  order(column: string, options?: OrderOptions): T;
}

function requested<K extends string>(sort: ListSort<K>, spec: SortSpec<K>): SortColumn | undefined {
  return sort.sort === undefined ? undefined : spec.columns[sort.sort];
}

function orderOf(order: SortOrder): OrderOptions {
  const options: OrderOptions = { ascending: order.ascending };
  if (order.nullsFirst !== undefined) options.nullsFirst = order.nullsFirst;
  return options;
}

function pickedOptions(picked: SortColumn, ascending: boolean): OrderOptions {
  const options: OrderOptions = { ascending };
  if (picked.nullsFirst !== undefined) options.nullsFirst = picked.nullsFirst;
  if (picked.referencedTable) options.referencedTable = picked.referencedTable;
  return options;
}

function tiebreakers<K extends string>(spec: SortSpec<K>, picked: SortColumn | undefined) {
  return picked ? (spec.tiebreak ?? spec.fallback) : spec.fallback;
}

/** The orders after a requested key: its tiebreakers without that column, then the unique key. */
function tail<K extends string>(spec: SortSpec<K>, picked: SortColumn | undefined): SortOrder[] {
  const own = picked && !picked.referencedTable ? picked.column : undefined;
  const rest = tiebreakers(spec, picked).filter((order) => order.column !== own);
  const key = spec.key ?? 'id';
  const keyed = own === key || rest.some((order) => order.column === key);
  return keyed ? rest : [...rest, { column: key, ascending: true }];
}

/** `.order()` for the requested key (asc unless `dir: 'desc'`), the fallback, the unique key. */
export function applySort<K extends string, T extends Orderable<T>>(
  query: T,
  sort: ListSort<K>,
  spec: SortSpec<K>,
): T {
  const picked = requested(sort, spec);
  const head = picked
    ? query.order(picked.column, pickedOptions(picked, sort.dir !== 'desc'))
    : query;
  return tail(spec, picked).reduce((q, order) => q.order(order.column, orderOf(order)), head);
}
