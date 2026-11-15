// URL state of a server-sorted/filtered list (R-NFR-08): `?sort=<key>&dir=desc&f_<key>=<value>`.
// Defaults stay out of the URL: no sort = the API's default order, no `dir` = asc, '' = no filter.

export type SortDir = 'asc' | 'desc';
/** What DataTable's `sort` prop reads and reports. */
export type SortSearch = { sort?: string; dir?: SortDir };
export type FilterSearch = Record<string, string>;

/** Filter params are namespaced so they never clash with `page`, `search` or a route's own keys. */
export const filterParam = (key: string) => `f_${key}`;

/** `sort`/`dir` from the URL: unknown keys are dropped, `dir` only with a sort and only when desc. */
export function parseSortSearch(search: Record<string, unknown>, keys: readonly string[]): SortSearch {
  const sort = search['sort'];
  if (typeof sort !== 'string' || !keys.includes(sort)) return {};
  return search['dir'] === 'desc' ? { sort, dir: 'desc' } : { sort };
}

/** `f_<key>` params for the allowlisted keys; non-empty strings only. */
export function parseFilterSearch(search: Record<string, unknown>, keys: readonly string[]): FilterSearch {
  const out: FilterSearch = {};
  for (const key of keys) {
    const value = search[filterParam(key)];
    if (typeof value === 'string' && value.trim() !== '') out[key] = value.trim();
  }
  return out;
}

/** DataTable's `sort.onChange` → route search (asc and none leave the URL). */
export function toSortSearch(next: { key?: string; dir?: SortDir }): { sort?: string; dir?: SortDir } {
  if (!next.key) return { sort: undefined, dir: undefined };
  return { sort: next.key, dir: next.dir === 'desc' ? 'desc' : undefined };
}

/** One filter change → route search patch (`f_<key>`; '' removes it). */
export function toFilterSearch(key: string, value: string): Record<string, string | undefined> {
  return { [filterParam(key)]: value.trim() === '' ? undefined : value.trim() };
}

/** «مسح الكل» → route search patch dropping every `f_<key>` of these keys. */
export function clearFilterSearch(keys: readonly string[]): Record<string, undefined> {
  return Object.fromEntries(keys.map((key) => [filterParam(key), undefined]));
}

/** The API query entries: `sort`, `dir` (only when desc) and each filter under its plain key. */
export function sortFilterParams(sort: SortSearch, filters: FilterSearch = {}): [string, string][] {
  const out: [string, string][] = [];
  if (sort.sort) out.push(['sort', sort.sort]);
  if (sort.sort && sort.dir === 'desc') out.push(['dir', 'desc']);
  for (const [key, value] of Object.entries(filters)) if (value !== '') out.push([key, value]);
  return out;
}
