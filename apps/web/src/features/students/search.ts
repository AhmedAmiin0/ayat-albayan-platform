import { STUDENT_SORT_KEYS, STUDENT_TEXT_FILTER_KEYS } from '@ab/shared';
import {
  filterParam,
  parseFilterSearch,
  parseSortSearch,
  toSortSearch,
  type FilterSearch,
  type SortSearch,
} from '@/lib/list-search';
import type { DataTableFilters, DataTableSort } from '@/components/DataTable';
import { activeFilterCount, parseStudentFilters, type StudentsFilters } from './filters';

/** The list's state: search, page, the R-STU-01 filters, the column sort and text filters. */
export type StudentsSearch = {
  search: string;
  page: number;
  filters?: StudentsFilters;
  sort?: SortSearch;
  /** Column text filters (code, name, guardian), `f_<key>` in the URL. */
  columns?: FilterSearch;
};

/** URL search of /admin/students; defaults (no search, page 1, no filter, no sort) are left out. */
export type StudentsUrlSearch = { search?: string; page?: number } & StudentsFilters &
  SortSearch & { f_code?: string; f_name?: string; f_guardian?: string };

export function parseStudentsSearch(s: Record<string, unknown>): StudentsUrlSearch {
  const out: StudentsUrlSearch = {
    search: typeof s['search'] === 'string' && s['search'] ? s['search'] : undefined,
    page: Number(s['page']) > 1 ? Math.floor(Number(s['page'])) : undefined,
    ...parseStudentFilters(s),
    ...parseSortSearch(s, STUDENT_SORT_KEYS),
  };
  const columns = parseFilterSearch(s, STUDENT_TEXT_FILTER_KEYS);
  for (const [key, value] of Object.entries(columns)) Object.assign(out, { [filterParam(key)]: value });
  return out;
}

/** URL search → the page's state. */
export function fromStudentsUrl(url: Record<string, unknown>): StudentsSearch {
  const { search = '', page = 1 } = parseStudentsSearch(url);
  return {
    search,
    page,
    filters: parseStudentFilters(url),
    sort: parseSortSearch(url, STUDENT_SORT_KEYS),
    columns: parseFilterSearch(url, STUDENT_TEXT_FILTER_KEYS),
  };
}

/** The page's state → URL search (parsed again, so blanks and defaults drop out). */
export function toStudentsUrl(next: StudentsSearch): StudentsUrlSearch {
  const columns = Object.entries(next.columns ?? {}).map(([k, v]) => [filterParam(k), v]);
  const sort = toSortSearch({ key: next.sort?.sort, dir: next.sort?.dir });
  return parseStudentsSearch({
    ...next.filters,
    ...Object.fromEntries(columns),
    ...sort,
    search: next.search,
    page: next.page,
  });
}

/** One column filter change: the trimmed value, or the key dropped when blank. */
export function setColumnFilter(columns: FilterSearch = {}, change: { key: string; value: string }): FilterSearch {
  const rest = Object.fromEntries(Object.entries(columns).filter(([k]) => k !== change.key));
  const value = change.value.trim();
  return value === '' ? rest : { ...rest, [change.key]: value };
}

/** Nothing searched or filtered: an empty result means the academy has no student yet. */
export const isUnfiltered = (v: StudentsSearch): boolean =>
  !v.search && activeFilterCount(v.filters ?? {}) === 0 && Object.keys(v.columns ?? {}).length === 0;

/** DataTable's server `sort` / `filters` props for this state; every change goes to page 1. */
export function studentTableControls(v: StudentsSearch, onChange: (next: StudentsSearch) => void) {
  const base = { ...v, page: 1 };
  const sort: DataTableSort = {
    key: v.sort?.sort,
    dir: v.sort?.dir,
    onChange: (next) => onChange({ ...base, sort: next.key ? { sort: next.key, dir: next.dir } : {} }),
  };
  const filters: DataTableFilters = {
    values: v.columns ?? {},
    onChange: (key, value) => onChange({ ...base, columns: setColumnFilter(v.columns, { key, value }) }),
  };
  return { sort, filters };
}
