import { isChatListError, type ChatList } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';

// «القوائم» (docs/22 §3): the academy's ONE shared set of chat lists. Lists only organise chats.

export const CHAT_LISTS_KEY = ['chat-lists'] as const;

/** Every list, oldest first; refetched on focus: another assistant may have changed them. */
export const chatListsQuery = queryOptions({
  queryKey: CHAT_LISTS_KEY,
  queryFn: () => apiFetch<ChatList[]>('/chat-lists'),
  refetchOnWindowFocus: true,
});

const listPath = (id: string) => `/chat-lists/${encodeURIComponent(id)}`;
const memberPath = (input: { id: string; phone: string }) => `${listPath(input.id)}/threads/${encodeURIComponent(input.phone)}`;

export const createList = (name: string) => apiSend<ChatList>('POST', '/chat-lists', { name });

export const renameList = (input: { id: string; name: string }) => apiSend<ChatList>('PATCH', listPath(input.id), { name: input.name });

export const deleteList = (id: string) => apiSend('DELETE', listPath(id));

/** In = PUT, out = DELETE; both idempotent (204). */
export const setMember = (input: { id: string; phone: string; member: boolean }) =>
  apiSend(input.member ? 'PUT' : 'DELETE', memberPath(input));

/** A change to lists or members: the chips' counts, the filtered thread list and the open chat's lists. */
export const refreshLists = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAT_LISTS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['threads'] }),
  ]);

/** The dialogs' inline error: a taken name, the 30-list cap, a list deleted meanwhile, or a generic one. */
export function listErrorText(error: unknown): string {
  const code = error instanceof ApiError && typeof error.body === 'object' && error.body !== null && 'code' in error.body ? error.body.code : null;
  if (isChatListError(code)) return code === 'list_limit' ? t.inbox.lists.limit : t.inbox.lists.nameTaken;
  if (error instanceof ApiError && error.status === 404) return t.inbox.lists.notFound;
  return t.inbox.lists.saveError;
}
