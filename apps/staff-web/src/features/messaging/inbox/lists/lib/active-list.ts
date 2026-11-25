import type { ChatList } from '@ab/shared';

/** An id not in the loaded lists (deleted, stale link) falls back to all chats (docs/22 §4). */
export function activeList(
  list: string | undefined,
  lists: readonly ChatList[] | undefined,
): string | undefined {
  if (!list || !lists) return list;
  return lists.some((l) => l.id === list) ? list : undefined;
}
