import type { ChatListRef } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api';
import { threadKey, type ThreadCache } from '../thread-cache';
import { listPath, listsKey, threadsKey } from './use-chat-lists';

export interface MemberChange {
  list: ChatListRef;
  /** true: add the chat to the list (PUT); false: take it out (DELETE). Both idempotent. */
  member: boolean;
}

/** The thread detail with the chat's `lists` (on the newest page) changed as the toggle asks. */
export function withMembership(data: ThreadCache | undefined, change: MemberChange): ThreadCache | undefined {
  const [first, ...rest] = data?.pages ?? [];
  if (!data || !first) return data;
  const others = (first.lists ?? []).filter((l) => l.id !== change.list.id);
  const lists = change.member ? [...others, change.list] : others;
  return { ...data, pages: [{ ...first, lists }, ...rest] };
}

/** The toggle that puts one failed change back (the rollback of useListMembership). */
export const undoChange = (change: MemberChange): MemberChange => ({ ...change, member: !change.member });

/**
 * Adds or removes this chat (by its phone) from a list, optimistically: the checkmark moves at
 * once and goes back if the API refuses (the caller shows saveError). Then the chat list (filtered
 * by a list), the thread detail and the counts refetch.
 */
export function useListMembership(phone: string) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation({
    mutationFn: ({ list, member }: MemberChange) =>
      apiSend(member ? 'PUT' : 'DELETE', `${listPath(list.id)}/threads/${encodeURIComponent(phone)}`),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData<ThreadCache>(queryKey, (old) => withMembership(old, change));
    },
    // Undo only this toggle: a snapshot would also undo a later toggle or a message cached meanwhile.
    onError: (_error, change) => client.setQueryData<ThreadCache>(queryKey, (old) => withMembership(old, undoChange(change))),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: threadsKey });
      void client.invalidateQueries({ queryKey: listsKey });
    },
  });
}
