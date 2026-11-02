import { z } from 'zod';

// Server-side sort for paginated lists (R-NFR-08): `?sort=<key>&dir=asc|desc`. Each list endpoint
// allowlists its own keys; the API maps a key to a column (apps/api common/list-sort.ts).

export const SORT_DIRS = ['asc', 'desc'] as const;
export type SortDir = (typeof SORT_DIRS)[number];

/** The parsed sort of a list query: no `sort` → the endpoint's default order. */
export type ListSort<K extends string = string> = { sort?: K | undefined; dir?: SortDir | undefined };

/** Spread into a list query schema: `z.object({ ...pageShape, ...listSortShape(['name', 'code']) })`. */
export function listSortShape<K extends string>(keys: readonly [K, ...K[]]) {
  return {
    sort: z.enum(keys).optional(),
    dir: z.enum(SORT_DIRS).optional(),
  };
}
