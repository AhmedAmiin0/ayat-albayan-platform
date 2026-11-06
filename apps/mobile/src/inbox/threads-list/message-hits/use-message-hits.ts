import { messageHits, messageSearchPages } from '@ab/client-core';
import { searchesMessages, type MessageSearchHit } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';

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

/**
 * «الرسائل» under the chats (docs/37 NEW 1): every message the caller may read that holds the
 * words, newest first (GET /threads/search). SearchField already debounces the words; never on
 * disk (noPersist) and never polled.
 */
export function useMessageHits(q: string): MessageHitsState {
  const query = useInfiniteQuery({
    ...messageSearchPages(q, (path) => apiFetch(path)),
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
