/** The search params of /admin/settings/values: the group in view, and the search text. */
export interface ValuesSearch {
  group?: string;
  q?: string;
}

/** Keeps only string params (unknown groups are resolved by the page). */
export function parseValuesSearch(search: Record<string, unknown>): ValuesSearch {
  const out: ValuesSearch = {};
  if (typeof search.group === 'string' && search.group !== '') out.group = search.group;
  if (typeof search.q === 'string' && search.q !== '') out.q = search.q;
  return out;
}
