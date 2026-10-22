import type { ChatList } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

// The academy's chat lists «القوائم» (docs/22): ONE shared set for every admin and assistant. They only
// organise the chats; nothing is ever sent because of a list.

/** ['chat-lists']: every list with its count. */
export const listsKey = pathKey('/chat-lists');
/** ['threads']: the chat list (filtered by `list`) and every thread detail (its `lists`). */
export const threadsKey = pathKey('/threads');
export const listPath = (id: string) => `/chat-lists/${encodeURIComponent(id)}`;

/**
 * GET /chat-lists, oldest first. `enabled` only for a holder of inbox.lists outside teacher mode.
 * Refetched when the app comes back to the foreground, as the chat list (another assistant may
 * have changed them).
 */
export function useChatLists(enabled: boolean) {
  return useQuery({
    queryKey: listsKey,
    queryFn: () => apiFetch<ChatList[]>('/chat-lists'),
    enabled,
  });
}

/** Keeps a list answer usable even if a mock or an older API answers something else. */
export const listsOf = (data: unknown): ChatList[] => (Array.isArray(data) ? (data as ChatList[]) : []);

/**
 * POST /chat-lists. The new list goes into the cache at once, so the chip the caller makes active
 * is already there (an unknown active list falls back to «الكل»).
 */
export function useCreateList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiSend<ChatList>('POST', '/chat-lists', { name }),
    onSuccess: (list) => {
      client.setQueryData<ChatList[]>(listsKey, (old) => [...listsOf(old), list]);
      void client.invalidateQueries({ queryKey: listsKey });
    },
  });
}

export interface RenameInput {
  id: string;
  name: string;
}

/** PATCH /chat-lists/:id. */
export function useRenameList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: RenameInput) => apiSend<ChatList>('PATCH', listPath(id), { name }),
    onSuccess: (list) => {
      client.setQueryData<ChatList[]>(listsKey, (old) => listsOf(old).map((l) => (l.id === list.id ? list : l)));
      void client.invalidateQueries({ queryKey: listsKey });
    },
  });
}

/** DELETE /chat-lists/:id: the list and its memberships only, never a chat. */
export function useDeleteList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend('DELETE', listPath(id)),
    onSuccess: (_none, id) => {
      client.setQueryData<ChatList[]>(listsKey, (old) => listsOf(old).filter((l) => l.id !== id));
      void client.invalidateQueries({ queryKey: listsKey });
      void client.invalidateQueries({ queryKey: threadsKey });
    },
  });
}
