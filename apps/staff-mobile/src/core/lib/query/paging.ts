import type { WithId } from '@ab/client-core';

/** Fields to overwrite on the row with this id, e.g. { id, status: 'contacted' }. */
export type Patch = WithId & Record<string, unknown>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function patchOne(item: unknown, patch: Patch): unknown {
  return isObject(item) && item.id === patch.id ? { ...item, ...patch } : item;
}

function patchItems(page: unknown, patch: Patch): unknown {
  if (!isObject(page) || !Array.isArray(page.items)) return page;
  return { ...page, items: page.items.map((i: unknown) => patchOne(i, patch)) };
}

/**
 * Applies `patch` to the row with the same id in any cached shape: an infinite list
 * ({ pages: Page[] }), one Page ({ items }), a plain array (GET /lessons/day), the schedule
 * overview ({ teachers, lessons }: its lessons), or a single detail object. Anything else is
 * returned as is.
 */
export function patchCached(data: unknown, patch: Patch): unknown {
  if (Array.isArray(data)) return data.map((i: unknown) => patchOne(i, patch));
  if (isObject(data) && Array.isArray(data.pages)) {
    return { ...data, pages: data.pages.map((p: unknown) => patchItems(p, patch)) };
  }
  if (isObject(data) && Array.isArray(data.items)) return patchItems(data, patch);
  if (isObject(data) && Array.isArray(data.lessons)) {
    return { ...data, lessons: data.lessons.map((l: unknown) => patchOne(l, patch)) };
  }
  return patchOne(data, patch);
}
