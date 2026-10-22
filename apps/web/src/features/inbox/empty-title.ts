import { t } from '@/lib/i18n';
import type { InboxSearch } from './search';

/**
 * The thread list's empty title. «لا محادثات في هذه القائمة بعد…» (docs/22 §4) only when the active
 * chat list is really empty: with a search, a status or «غير المقروءة» on top, it may have chats.
 */
export function emptyTitle(search: InboxSearch): string {
  if (search.unread) return t.inbox.emptyUnread;
  return search.list && !search.q && !search.f_status ? t.inbox.lists.empty : t.inbox.empty;
}
