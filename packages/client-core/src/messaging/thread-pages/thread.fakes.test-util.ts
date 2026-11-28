import type { MessageView, ThreadDetail, ThreadView } from '@ab/shared';
import type { ThreadPages } from '../inbox';
import type { ListPage, ListPages } from './list-cache';
import { provisionalMessage } from './provisional';

type ListCache = ListPages & { pageParams: number[] };

// Chat pages for the thread-pages tests: rows minutes apart, a page, a cache of pages.

export const PHONE = '+20100000000';
const NOW = Date.parse('2026-11-06T10:00:00Z');

export const msg = (n: number, over: Partial<MessageView> = {}): MessageView => ({
  ...provisionalMessage({ id: `m${n}`, phone: PHONE, body: `m${n}`, now: new Date(NOW + n * 60_000) }),
  status: 'delivered',
  ...over,
});

const thread = { phone_e164: PHONE, unread_count: 0, session_open: true } as ThreadView;

export const page = (messages: MessageView[], has_more = false): ThreadDetail => ({
  thread,
  messages,
  has_more,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
});

export const cache = (...pages: ThreadDetail[]): ThreadPages => ({
  pages,
  pageParams: pages.map(() => null),
});

/** Every row id, newest page first, as the cache holds them. */
export const ids = (data: ThreadPages | undefined): string[][] =>
  (data?.pages ?? []).map((p) => p.messages.map((m) => m.id));

/** A chats-list row of `phone` whose last message `id` was sent `n` minutes after NOW. */
export const listRow = (phone: string, n: number, over: Partial<ThreadView> = {}): ThreadView =>
  ({
    phone_e164: phone,
    last_message_id: `m${n}`,
    last_direction: 'inbound',
    last_body: `m${n}`,
    last_status: 'delivered',
    last_message_at: new Date(NOW + n * 60_000).toISOString(),
    unread_count: 0,
    ...over,
  }) as ThreadView;

/** Page `page` of GET /threads (25 rows a page), `total` rows in all. */
export const listPage = (total: number, items: ThreadView[], page = 1): ListPage => ({
  items,
  total,
  page,
  pageSize: 25,
});

/** A cached infinite chats list: one page per array. */
export const listCache = (total: number, ...pages: ThreadView[][]): ListCache => ({
  pages: pages.map((items, i) => listPage(total, items, i + 1)),
  pageParams: pages.map((_, i) => i + 1),
});

/** Every row's phone, page by page. */
export const phones = (data: ListPages | null | undefined): string[][] =>
  (data?.pages ?? []).map((p) => p.items.map((th) => th.phone_e164));
