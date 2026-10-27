import type { MessageView, ThreadView } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import type { Page } from '@/core/lib/query/paging';
import type { ThreadCache } from './thread-cache';

// The cache edits the chats list makes while a refetch confirms them (owner 2026-10-27): a send moves
// its chat to the top, an opened chat loses its unread badge. A chat a cached list does not hold
// (another filter, a search) is left to that list's refetch.

/** One cached GET /threads list (useThreadList): pages[0] is the newest page. */
export type ThreadListCache = InfiniteData<Page<ThreadView>>;

/** The chat on top of the list with `row` as its last message, as WhatsApp does on a send. */
export function touchList(data: ThreadListCache | undefined, row: MessageView): ThreadListCache | undefined {
  const phone = row.phone_e164;
  const found = data?.pages.flatMap((p) => p.items).find((th) => th.phone_e164 === phone);
  if (!data || !found) return data;
  const moved: ThreadView = {
    ...found,
    last_message_id: row.id,
    last_direction: row.direction,
    last_body: row.body,
    last_template_key: row.template_key,
    last_status: row.status,
    last_media_mime: row.media_mime,
    last_unsupported: false,
    last_message_at: row.created_at,
  };
  const pages = data.pages.map((p, i) => {
    const items = p.items.filter((th) => th.phone_e164 !== phone);
    return { ...p, items: i === 0 ? [moved, ...items] : items };
  });
  return { ...data, pages };
}

/** The chat's unread badge cleared (the API stamped it read); the same object when nothing changes. */
export function clearUnread(data: ThreadListCache | undefined, phone: string): ThreadListCache | undefined {
  const unread = (th: ThreadView) => th.phone_e164 === phone && th.unread_count > 0;
  if (!data?.pages.some((p) => p.items.some(unread))) return data;
  const read = (th: ThreadView) => (unread(th) ? { ...th, unread_count: 0 } : th);
  return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map(read) })) };
}

/** The newest received message's id on the loaded newest page; '' when there is none. */
export function newestInbound(data: ThreadCache | undefined): string {
  const messages = data?.pages[0]?.messages ?? [];
  return [...messages].reverse().find((m) => m.direction === 'inbound')?.id ?? '';
}
