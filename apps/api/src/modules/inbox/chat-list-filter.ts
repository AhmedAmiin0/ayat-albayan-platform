import type { ThreadDetail } from '@ab/shared';
import type { AuthUser } from '../../common/auth/verify-token';
import { isListId, seesLists } from '../chat-lists/chat-lists.guard';
import type { ChatListsQueries } from '../chat-lists/chat-lists.queries';
import type { ThreadListFilter } from './threads.list';

/**
 * GET /threads?list=<uuid> (docs/22 §3): only that list's chats, with the other filters. A caller
 * without inbox.lists (or a teacher) has the param ignored; an unknown or malformed id, or an empty
 * list, is `null` = an empty page (never a 500).
 */
export async function listFilter(
  f: ThreadListFilter,
  input: { user: AuthUser; lists: ChatListsQueries | undefined },
): Promise<ThreadListFilter | null> {
  const { list, ...rest } = f;
  if (!list || !input.lists || !seesLists(input.user)) return rest;
  if (!isListId(list)) return null;
  const phones = await input.lists.phonesOf(list);
  return phones.length > 0 ? { ...rest, phones } : null;
}

/** The open chat's lists on its first page, for callers with inbox.lists; the detail as is otherwise. */
export async function withLists(
  detail: ThreadDetail,
  input: { user: AuthUser; lists: ChatListsQueries | undefined; phone: string; first: boolean },
): Promise<ThreadDetail> {
  if (!input.first || !input.lists || !seesLists(input.user)) return detail;
  return { ...detail, lists: await input.lists.listsOf(input.phone) };
}
