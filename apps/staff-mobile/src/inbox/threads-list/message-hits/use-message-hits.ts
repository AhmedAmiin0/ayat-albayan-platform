import { inboxSearchCalls, messageHits, messageSearchPages } from '@ab/client-core';
import { searchesMessages, type MessageSearchHit } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';

const searches = inboxSearchCalls({ apiFetch, apiSend });

/** What the chats list knows of the global search. */
export interface MessageHitsState {
  /** The words are long enough to search messages (3 folded characters). */
  asked: boolean;
  hits: MessageSearchHit[];
  searching: boolean;
  failed: boolean;
  /** Older hits remain (a short page is not the end: only a null cursor is). */
  more: boolean;
  loadMore: () => void;
}

/** docs/37 NEW 1: never persisted to disk and never polled; SearchField already debounces. */
export function useMessageHits(q: string): MessageHitsState {
  const query = useInfiniteQuery({
    ...messageSearchPages(q, searches),
    meta: { noPersist: true },
  });
  const asked = searchesMessages(q);
  return {
    asked,
    hits: messageHits(query.data?.pages),
    searching: asked && query.isPending,
    failed: query.isError,
    more: query.hasNextPage && !query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage({ cancelRefetch: false }),
  };
}
