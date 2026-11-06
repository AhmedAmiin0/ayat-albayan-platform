import type { MessageView, ThreadDetail, ThreadView } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';
import { provisionalMessage } from './provisional.js';

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
