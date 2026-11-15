import { CHAT_SEARCH_DEBOUNCE_MS, searchHits, type ChatSearchState } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebounced } from '@/features/finance/pricing';
import { chatSearchQuery } from './chat-search-api';

/**
 * The open search's hits: asked once typing settles; while the words still change, the last
 * search's hits are neither shown nor followed (the bar says «جارٍ البحث…»).
 */
export function useSearchResults(phone: string, state: ChatSearchState) {
  const settled = useDebounced(state.text.trim(), CHAT_SEARCH_DEBOUNCE_MS);
  const q = state.open ? settled : '';
  const query = useInfiniteQuery(chatSearchQuery(phone, q));
  const typing = state.text.trim() !== settled;
  const { hits, total } = searchHits(typing ? undefined : query.data?.pages);
  const searching = q !== '' && (typing || query.isPending);
  return { q, query, hits, total, searching, failed: query.isError };
}
