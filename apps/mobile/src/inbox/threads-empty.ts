import { t } from '@/lib/i18n';

/**
 * The thread list's empty title. «لا محادثات في هذه القائمة بعد…» only when the active chat list
 * (docs/22) is really empty: with a search or «غير المقروءة» on top, the list may have chats.
 */
export function threadsEmptyTitle(f: { listId: string | null; filter: 'all' | 'unread'; search: string }): string {
  if (f.filter === 'unread') return t.inbox.emptyUnread;
  return f.listId && f.search === '' ? t.inbox.lists.empty : t.inbox.empty;
}
