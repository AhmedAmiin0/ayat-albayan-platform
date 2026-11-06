import {
  messageSearchPageSchema,
  searchesMessages,
  type MessageSearchHit,
  type MessageSearchPage,
} from '@ab/shared';
import type { SearchGet } from '../chat-search/index.js';

// «بحث في كل الرسائل» (owner 2026-11-06, docs/37), shared by web and mobile: the chats list's
// «الرسائل» section. Hits are newest first; a page per cursor, no total (as WhatsApp).

/** Under ['threads'] on purpose: the inbox's ['threads'] invalidations refresh it too. */
export const messageSearchKey = (q: string) => ['threads', 'message-search', q] as const;

/** GET /threads/search: the words always encoded, the cursor only when given. */
export function messageSearchPath(q: string, cursor?: string): string {
  const params = new URLSearchParams({ q });
  if (cursor) params.set('cursor', cursor);
  return `/threads/search?${params.toString()}`;
}

/** useInfiniteQuery's options (plain: client-core has no react-query). */
export interface MessageSearchPagesOptions {
  queryKey: ReturnType<typeof messageSearchKey>;
  queryFn: (ctx: { pageParam: string | undefined }) => Promise<MessageSearchPage>;
  initialPageParam: string | undefined;
  getNextPageParam: (last: MessageSearchPage) => string | undefined;
  enabled: boolean;
  staleTime: number;
}

/**
 * The global search's pages for either app: asked only from MESSAGE_SEARCH_MIN folded characters,
 * every answer checked (rule 12). A short page is not the end: only a null cursor is.
 */
export function messageSearchPages(q: string, get: SearchGet): MessageSearchPagesOptions {
  return {
    queryKey: messageSearchKey(q),
    queryFn: async ({ pageParam }) =>
      messageSearchPageSchema.parse(await get(messageSearchPath(q, pageParam))),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: searchesMessages(q),
    staleTime: 30_000,
  };
}

/** Every loaded hit, newest first. */
export const messageHits = (pages: readonly MessageSearchPage[] | undefined): MessageSearchHit[] =>
  (pages ?? []).flatMap((p) => p.items);
