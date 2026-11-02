import { chatSearchKey, chatSearchPath, parseChatSearchPage } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';

/** «بحث» inside a chat: newest hit first, a page per cursor; nothing asked for a blank search. */
export function useChatSearchQuery(phone: string, q: string) {
  return useInfiniteQuery({
    queryKey: chatSearchKey(phone, q),
    queryFn: async ({ pageParam }) =>
      parseChatSearchPage(await apiFetch(chatSearchPath(phone, q, pageParam))),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: q !== '',
    staleTime: 30_000,
  });
}
