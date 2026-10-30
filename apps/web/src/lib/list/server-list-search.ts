import type { DataTableFilters, DataTableSort } from '@/components/data-table/data-table-features';
import {
  clearFilterSearch,
  parseFilterSearch,
  parseSortSearch,
  toFilterSearch,
  toSortSearch,
  type FilterSearch,
  type SortDir,
  type SortSearch,
} from './list-search';

// A paged, server-sorted list's whole URL state (R-NFR-08): `page`, `sort`, `dir`, `f_<key>`.
// Routes use `parseServerListSearch` as `validateSearch`; pages read `serverListState`.

export type ServerListSearch = { page?: number; sort?: string; dir?: SortDir } & { [key: `f_${string}`]: string | undefined };
/** A route-search patch: undefined drops a key. */
export type ServerListPatch = Record<string, string | number | undefined>;

export interface ServerListKeys {
  sort: readonly string[];
  filters: readonly string[];
}

/** Route `validateSearch`: page > 1 only, allowlisted sort and filter keys, defaults out of the URL. */
export function parseServerListSearch(search: Record<string, unknown>, keys: ServerListKeys): ServerListSearch {
  const page = Number(search['page']);
  const out: ServerListSearch = { ...parseSortSearch(search, keys.sort) };
  if (Number.isInteger(page) && page > 1) out.page = page;
  for (const [key, value] of Object.entries(parseFilterSearch(search, keys.filters))) out[`f_${key}`] = value;
  return out;
}

export interface ServerListState {
  page: number;
  sort: SortSearch;
  filters: FilterSearch;
}

export function serverListState(search: Record<string, unknown>, keys: ServerListKeys): ServerListState {
  const page = Number(search['page']);
  return {
    page: Number.isInteger(page) && page > 1 ? page : 1,
    sort: parseSortSearch(search, keys.sort),
    filters: parseFilterSearch(search, keys.filters),
  };
}

/** DataTable's `sort` / `filters` props over the URL; a change goes back to page 1. */
export function serverListProps(
  state: ServerListState,
  onSearch: (patch: ServerListPatch) => void,
): { sort: DataTableSort; filters: DataTableFilters; onPage: (page: number) => void } {
  return {
    sort: {
      key: state.sort.sort,
      dir: state.sort.dir,
      onChange: (next) => onSearch({ ...toSortSearch(next), page: undefined }),
    },
    filters: {
      values: state.filters,
      onChange: (key, value) => onSearch({ ...toFilterSearch(key, value), page: undefined }),
      onClear: (keys) => onSearch({ ...clearFilterSearch(keys), page: undefined }),
    },
    onPage: (page) => onSearch({ page: page > 1 ? page : undefined }),
  };
}
