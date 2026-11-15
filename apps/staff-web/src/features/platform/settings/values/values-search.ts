/** «المعدَّلة فقط» / «العامة فقط» (desktop filters; like the search, they list every group under «الكل»). */
export type ValuesFilter = 'modified' | 'public';

/** The search params of /admin/settings/values: the group in view, the search text, a filter. */
export interface ValuesSearch {
  group?: string;
  q?: string;
  filter?: ValuesFilter;
}

const isFilter = (v: unknown): v is ValuesFilter => v === 'modified' || v === 'public';

/** Keeps only string params (unknown groups are resolved by the page). */
export function parseValuesSearch(search: Record<string, unknown>): ValuesSearch {
  const out: ValuesSearch = {};
  if (typeof search.group === 'string' && search.group !== '') out.group = search.group;
  if (typeof search.q === 'string' && search.q !== '') out.q = search.q;
  if (isFilter(search.filter)) out.filter = search.filter;
  return out;
}

/** Is the page showing «الكل» (a search or a filter) rather than one group? */
export const showsAll = (s: ValuesSearch): boolean => (s.q ?? '').trim() !== '' || s.filter !== undefined;
