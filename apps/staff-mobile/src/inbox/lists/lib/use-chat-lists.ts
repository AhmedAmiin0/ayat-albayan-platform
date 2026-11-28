import { chatListCalls } from '@ab/client-core';
import type { ChatList } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

// docs/22: one shared set for all admins and assistants; a list never causes a message send.

/** ['chat-lists']: every list with its count. */
export const listsKey = pathKey('/chat-lists');
/** ['threads']: the chat list (filtered by `list`) and every thread detail (its `lists`). */
export const threadsKey = pathKey('/threads');
export const chatLists = chatListCalls({ apiFetch, apiSend });

/**
 * GET /chat-lists, oldest first. `enabled` only for a holder of inbox.lists outside teacher mode.
 * Refetched when the app comes back to the foreground, as the chat list (another assistant may
 * have changed them).
 */
export function useChatLists(enabled: boolean) {
  return useQuery({
    queryKey: listsKey,
    queryFn: () => chatLists.all(),
    enabled,
  });
}

/** The cached lists, or none before the first answer. */
export const listsOf = (data: ChatList[] | undefined): ChatList[] => data ?? [];

/** The new list enters the cache at once so the caller's active chip already exists. */
export function useCreateList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => chatLists.create(name),
    onSuccess: (list) => {
      client.setQueryData<ChatList[]>(listsKey, (old) => [...listsOf(old), list]);
      void client.invalidateQueries({ queryKey: listsKey });
    },
  });
}

interface RenameInput {
  id: string;
  name: string;
}

/** PATCH /chat-lists/:id. */
export function useRenameList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameInput) => chatLists.rename(input),
    onSuccess: (list) => {
      client.setQueryData<ChatList[]>(listsKey, (old) =>
        listsOf(old).map((l) => (l.id === list.id ? list : l)),
      );
      void client.invalidateQueries({ queryKey: listsKey });
    },
  });
}

/** DELETE /chat-lists/:id: the list and its memberships only, never a chat. */
export function useDeleteList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatLists.remove(id),
    onSuccess: (_none, id) => {
      client.setQueryData<ChatList[]>(listsKey, (old) => listsOf(old).filter((l) => l.id !== id));
      void client.invalidateQueries({ queryKey: listsKey });
      void client.invalidateQueries({ queryKey: threadsKey });
    },
  });
}
