import { chatSearchPages } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';

/** «بحث» inside a chat (client-core's chatSearchPages over this app's fetch). */
export function useChatSearchQuery(phone: string, q: string) {
  return useInfiniteQuery(chatSearchPages(phone, q, (path) => apiFetch(path)));
}
