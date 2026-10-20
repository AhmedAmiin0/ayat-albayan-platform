import type { ChatList } from '@ab/shared';

/**
 * The list the chip row shows (docs/22 §4): the URL's `list` while the lists load, or when it is one
 * of them; an id that is not (deleted by another assistant, a stale link) falls back to «الكل».
 */
export function activeList(list: string | undefined, lists: readonly ChatList[] | undefined): string | undefined {
  if (!list || !lists) return list;
  return lists.some((l) => l.id === list) ? list : undefined;
}
