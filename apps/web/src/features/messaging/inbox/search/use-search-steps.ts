import { needsSearchPage } from '@ab/client-core';
import type { ChatSearchHit } from '@ab/shared';
import { useEffect, useEffectEvent } from 'react';

interface Steps {
  hits: readonly ChatSearchHit[];
  index: number;
  /** The search's next page (newest first: older hits). */
  more: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
  seek: (id: string) => void;
}

/**
 * The bar's shown hit, followed: a new one is sought in the chat (useSeekMessage); one past the
 * loaded hits loads the search's next page first.
 */
export function useSearchSteps({ hits, index, more, seek }: Steps): void {
  const shown = hits[index]?.id;
  const go = useEffectEvent((id: string) => seek(id));
  const load = useEffectEvent(() => {
    const ready = more.hasNextPage && !more.isFetchingNextPage;
    if (ready && needsSearchPage(index, hits.length)) more.fetchNextPage();
  });
  useEffect(() => {
    if (shown) go(shown);
  }, [shown]);
  useEffect(() => load(), [index, hits.length]);
}
