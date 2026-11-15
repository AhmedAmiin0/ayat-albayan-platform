import {
  filterParam,
  parseFilterSearch,
  parseSortSearch,
  toSortSearch,
  type FilterSearch,
  type SortDir,
  type SortSearch,
} from './list-search';

// A paginated list's whole URL state (R-NFR-08): page, sort and column filters, for routes whose
// search holds nothing else. `?page=` is left out on page 1, like every other default.

export type ListUrlState = { page: number; sort: SortSearch; filters: FilterSearch };
export type ListUrlSearch = { page?: number; sort?: string; dir?: SortDir } & Record<string, string | number | undefined>;
export type ListUrlKeys = { sortKeys: readonly string[]; filterKeys: readonly string[] };

function toPage(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Raw route search → state: unknown sort keys, blank filters and bad pages dropped. */
export function parseListUrl(search: Record<string, unknown>, keys: ListUrlKeys): ListUrlState {
  return {
    page: toPage(search['page']),
    sort: parseSortSearch(search, keys.sortKeys),
    filters: parseFilterSearch(search, keys.filterKeys),
  };
}

/** State → route search: defaults left out. */
export function toListUrl(state: ListUrlState): ListUrlSearch {
  const out: ListUrlSearch = {};
  if (state.page > 1) out.page = state.page;
  const sort = toSortSearch({ key: state.sort.sort, dir: state.sort.dir });
  if (sort.sort) out.sort = sort.sort;
  if (sort.dir) out.dir = sort.dir;
  for (const [key, value] of Object.entries(state.filters)) if (value.trim() !== '') out[filterParam(key)] = value.trim();
  return out;
}

/** A route's `validateSearch` for such a list. */
export const listUrlValidator = (keys: ListUrlKeys) => (search: Record<string, unknown>) =>
  toListUrl(parseListUrl(search, keys));

/** A header click → the state on page 1. */
export function withSort(state: ListUrlState, next: { key?: string; dir?: SortDir }): ListUrlState {
  return { ...state, page: 1, sort: next.key ? { sort: next.key, ...(next.dir ? { dir: next.dir } : {}) } : {} };
}

/** A filter change → the state on page 1 ('' drops the filter). */
export function withFilter(state: ListUrlState, change: { key: string; value: string }): ListUrlState {
  const rest = Object.fromEntries(Object.entries(state.filters).filter(([k]) => k !== change.key));
  const value = change.value.trim();
  return { ...state, page: 1, filters: value === '' ? rest : { ...rest, [change.key]: value } };
}

/** «مسح الكل» → the state on page 1 without these filters. */
export function withoutFilters(state: ListUrlState, keys: readonly string[]): ListUrlState {
  const filters = Object.fromEntries(Object.entries(state.filters).filter(([k]) => !keys.includes(k)));
  return { ...state, page: 1, filters };
}
