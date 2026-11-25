import { t } from '@ab/web-kit';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';

/** The empty-list title only applies when the list is truly empty, not filtered (docs/22 §4). */
export function emptyTitle(search: InboxSearch): string {
  if (search.unread) return t.inbox.emptyUnread;
  return search.list && !search.q && !search.f_status ? t.inbox.lists.empty : t.inbox.empty;
}
