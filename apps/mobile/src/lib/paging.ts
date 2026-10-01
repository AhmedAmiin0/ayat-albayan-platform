/** Every list endpoint answers this shape (apps/api `Page<T>`, R-NFR-08). */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WithId {
  id: string;
}

/** Fields to overwrite on the row with this id, e.g. { id, status: 'contacted' }. */
export type Patch = WithId & Record<string, unknown>;

export function nextPageParam(last: Page<unknown>): number | undefined {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined;
}

/** Pages → one list. Offset paging repeats a row when one is inserted mid-scroll: keep the first. */
export function flattenPages<T extends WithId>(pages: readonly Page<T>[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of pages.flatMap((p) => p.items)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function patchOne(item: unknown, patch: Patch): unknown {
  return isObject(item) && item['id'] === patch.id ? { ...item, ...patch } : item;
}

function patchItems(page: unknown, patch: Patch): unknown {
  if (!isObject(page) || !Array.isArray(page['items'])) return page;
  return { ...page, items: page['items'].map((i: unknown) => patchOne(i, patch)) };
}

/**
 * Applies `patch` to the row with the same id in any cached shape: an infinite list
 * ({ pages: Page[] }), one Page ({ items }), or a single detail object. Anything else is returned as is.
 */
export function patchCached(data: unknown, patch: Patch): unknown {
  if (isObject(data) && Array.isArray(data['pages'])) {
    return { ...data, pages: data['pages'].map((p: unknown) => patchItems(p, patch)) };
  }
  if (isObject(data) && Array.isArray(data['items'])) return patchItems(data, patch);
  return patchOne(data, patch);
}
