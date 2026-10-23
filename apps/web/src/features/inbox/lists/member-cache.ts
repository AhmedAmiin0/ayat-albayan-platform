import type { ChatList, ChatListRef } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { threadQuery } from '../api';
import { CHAT_LISTS_KEY } from './api';
import type { MemberIntent } from './member-queue';

/**
 * A saved toggle, written into the open chat's cached lists at once, so the chips and a reopened
 * checklist show it before the refetch lands (which then confirms it).
 */
export function patchThreadLists(queryClient: QueryClient, intent: MemberIntent): void {
  const list = queryClient.getQueryData<ChatList[]>(CHAT_LISTS_KEY)?.find((l) => l.id === intent.id);
  const patch = (lists: ChatListRef[]): ChatListRef[] => {
    const rest = lists.filter((l) => l.id !== intent.id);
    return intent.member && list ? [...rest, { id: list.id, name: list.name }] : rest;
  };
  queryClient.setQueryData(threadQuery(intent.phone).queryKey, (data) => {
    const [first, ...older] = data?.pages ?? [];
    if (!data || !first?.lists) return data;
    return { ...data, pages: [{ ...first, lists: patch(first.lists) }, ...older] };
  });
}
