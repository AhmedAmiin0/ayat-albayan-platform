import { messageHits, messageSearchPages } from '@ab/client-core';
import { searchesMessages } from '@ab/shared';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';

/** «الرسائل» (docs/37): client-core's pages over this app's fetch; ['threads'] refreshes it. */
const messageSearchQuery = (q: string) =>
  infiniteQueryOptions(messageSearchPages(q, (path) => apiFetch(path)));

export type HitsPhase = 'searching' | 'failed' | 'empty' | 'found';

const phaseOf = (s: { pending: boolean; failed: boolean; none: boolean }): HitsPhase => {
  const phases: [boolean, HitsPhase][] = [
    [s.failed, 'failed'],
    [s.pending, 'searching'],
    [s.none, 'empty'],
  ];
  return phases.find(([on]) => on)?.[1] ?? 'found';
};

/**
 * The list's message hits for the (already debounced) search box: asked from 3 folded
 * characters, newest first, a page per «عرض مزيد من الرسائل». A short page is not the end.
 */
export function useMessageHits(q: string) {
  const query = useInfiniteQuery(messageSearchQuery(q));
  const hits = messageHits(query.data?.pages);
  const more = query.hasNextPage;
  const phase = phaseOf({
    pending: query.isPending,
    failed: query.isError,
    none: hits.length === 0 && !more,
  });
  return {
    /** The section shows at all (3 folded characters typed). */
    shown: searchesMessages(q),
    q,
    hits,
    phase,
    more,
    loadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
  };
}

export type MessageHitsState = ReturnType<typeof useMessageHits>;
