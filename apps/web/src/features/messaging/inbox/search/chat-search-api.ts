import { chatSearchKey, chatSearchPath, parseChatSearchPage } from '@ab/client-core';
import { infiniteQueryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';

/** «بحث» inside a chat: newest hit first, a page per cursor; none asked for a blank search. */
export const chatSearchQuery = (phone: string, q: string) =>
  infiniteQueryOptions({
    queryKey: chatSearchKey(phone, q),
    queryFn: async ({ pageParam }) =>
      parseChatSearchPage(await apiFetch(chatSearchPath(phone, q, pageParam))),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: q !== '',
    staleTime: 30_000,
  });
