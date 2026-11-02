import { chatSearchPages, needsSearchPage, searchHits } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { apiFetch } from '@/core/lib/http/api';

interface Asked {
  phone: string;
  /** The settled words ('' asks nothing). */
  q: string;
  /** Still typing: the last search's hits are neither shown nor followed. */
  typing: boolean;
  /** The shown hit: past the loaded ones, the next page loads (whatever taps led there). */
  index: number;
}

/** «بحث» inside a chat (client-core's chatSearchPages over this app's fetch) and its hits. */
export function useChatSearchResults({ phone, q, typing, index }: Asked) {
  const query = useInfiniteQuery(chatSearchPages(phone, q, (path) => apiFetch(path)));
  const { hits, total } = searchHits(typing ? undefined : query.data?.pages);
  const more = useEffectEvent(() => {
    const idle = query.hasNextPage && !query.isFetchingNextPage;
    if (idle && needsSearchPage(index, hits.length)) void query.fetchNextPage();
  });
  useEffect(() => more(), [index, hits.length]);
  const searching = q !== '' && (typing || query.isPending);
  return { hits, total, searching, failed: query.isError };
}
