import { chatListCalls, chatListErrorWords } from '@ab/client-core';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, t } from '@ab/web-kit';
import { threadKeys } from '@/features/messaging/inbox/api/keys';
import type { MemberIntent } from './member-queue';

// docs/22 §3: one academy-wide shared set of chat lists; lists only organise chats.

export const CHAT_LISTS_KEY = ['chat-lists'] as const;

const lists = chatListCalls({ apiFetch, apiSend });

/** Every list, oldest first; refetched on focus: another assistant may have changed them. */
export const chatListsQuery = queryOptions({
  queryKey: CHAT_LISTS_KEY,
  queryFn: () => lists.all(),
  refetchOnWindowFocus: true,
});

export const createList = (name: string) => lists.create(name);

export const renameList = (input: { id: string; name: string }) => lists.rename(input);

export const deleteList = (id: string) => lists.remove(id);

/** In = PUT, out = DELETE; both idempotent (204). */
export const setMember = ({ member, ...thread }: MemberIntent) =>
  member ? lists.addThread(thread) : lists.dropThread(thread);

/** A change to lists or members: the chips' counts, the filtered thread list and the open chat's lists. */
export const refreshLists = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAT_LISTS_KEY }),
    queryClient.invalidateQueries({ queryKey: threadKeys.all }),
  ]);

/** The dialogs' inline error: a taken name, the 30-list cap, a list deleted meanwhile, or a generic one. */
export const listErrorText: (error: unknown) => string = chatListErrorWords(() => t.inbox.lists);
