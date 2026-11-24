import { messageHits, messageSearchPages } from '@ab/client-core';
import { searchesMessages } from '@ab/shared';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit/lib/http/api';

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

/** Asked from 3 folded characters; a short page is not the end. */
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
