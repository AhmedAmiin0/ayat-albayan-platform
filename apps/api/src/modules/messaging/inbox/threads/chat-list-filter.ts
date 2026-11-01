import type { ThreadDetail } from '@ab/shared';
import type { AuthUser } from '@/common/auth/verify-token';
import { isListId, seesLists } from '@/modules/messaging/chat-lists/chat-lists.guard';
import type { ChatListsRepo } from '@/modules/messaging/chat-lists/chat-lists.repo';
import type { ThreadListFilter } from './threads.list';

/**
 * GET /threads?list=<uuid> (docs/22 §3): only that list's chats, with the other filters (ThreadsQueries
 * reads v_list_threads, filtered in SQL). A caller without inbox.lists has the param ignored; a
 * malformed id is `null` = an empty page (never a 500); an unknown or empty list is an empty page too.
 */
export function listFilter(f: ThreadListFilter, user: AuthUser): ThreadListFilter | null {
  const { list, ...rest } = f;
  if (!list || !seesLists(user)) return rest;
  return isListId(list) ? { ...rest, list } : null;
}

/** The open chat's lists on its first page, for callers with inbox.lists; the detail as is otherwise. */
export async function withLists(
  detail: ThreadDetail,
  input: { user: AuthUser; lists: ChatListsRepo | undefined; phone: string; first: boolean },
): Promise<ThreadDetail> {
  if (!input.first || !input.lists || !seesLists(input.user)) return detail;
  return { ...detail, lists: await input.lists.listsOf(input.phone) };
}
