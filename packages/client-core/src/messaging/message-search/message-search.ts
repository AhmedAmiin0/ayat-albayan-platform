import { searchesMessages, type MessageSearchHit, type MessageSearchPage } from '@ab/shared';
import type { InboxSearchCalls } from '../inbox';

// Search across all messages (docs/37): newest first, a page per cursor, no total.

/** Under ['threads'] on purpose: the inbox's ['threads'] invalidations refresh it too. */
export const messageSearchKey = (q: string) => ['threads', 'message-search', q] as const;

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
 * every answer parsed by its route. A short page is not the end: only a null cursor is.
 */
export function messageSearchPages(
  q: string,
  calls: Pick<InboxSearchCalls, 'messages'>,
): MessageSearchPagesOptions {
  return {
    queryKey: messageSearchKey(q),
    queryFn: ({ pageParam }) => calls.messages({ q, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: searchesMessages(q),
    staleTime: 30_000,
  };
}

/** Every loaded hit, newest first. */
export const messageHits = (pages: readonly MessageSearchPage[] | undefined): MessageSearchHit[] =>
  (pages ?? []).flatMap((p) => p.items);
