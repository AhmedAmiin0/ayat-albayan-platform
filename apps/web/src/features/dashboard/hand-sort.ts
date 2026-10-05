import { useMemo, useState } from 'react';
import { compareValues, nextSortDir } from '@/components/client-sort';

// Client sort for the dashboard's hand-built summary tables (they keep their <th scope="row">
// row headers, which DataTable does not render): header clicks cycle asc → desc → none.

export type HandSortState<K extends string> = { key: K; dir: 'asc' | 'desc' } | null;

/** The rows in the requested order (Arabic collation, numbers numerically); none = as given. */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: HandSortState<K>,
  valueOf: (row: T, key: K) => unknown,
): T[] {
  if (!sort) return [...rows];
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareValues(valueOf(a, sort.key), valueOf(b, sort.key)));
}

/** The next state after a click on `key`'s header. */
export function toggleSort<K extends string>(sort: HandSortState<K>, key: K): HandSortState<K> {
  const next = nextSortDir(sort?.key === key ? sort.dir : false);
  return next === false ? null : { key, dir: next };
}

export interface HandSort<T, K extends string> {
  rows: T[];
  sort: HandSortState<K>;
  toggle: (key: K) => void;
}

export function useHandSort<T, K extends string>(rows: readonly T[], valueOf: (row: T, key: K) => unknown): HandSort<T, K> {
  const [sort, setSort] = useState<HandSortState<K>>(null);
  const sorted = useMemo(() => sortRows(rows, sort, valueOf), [rows, sort, valueOf]);
  return { rows: sorted, sort, toggle: (key) => setSort((s) => toggleSort(s, key)) };
}
