import { type ChatSendState, staffMaySend } from '@ab/client-core';
import { sessionWindowOpen, type ThreadView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { threadKey, type ThreadCache } from './thread-cache';

type SendThread = Pick<ThreadView, 'last_inbound_at' | 'try_after_window'>;

/** The send rule's input for a chat: its 24 h window by the device clock, and the Kapso flag. */
export function sendState(thread: SendThread | null | undefined, now: Date): ChatSendState {
  return {
    open: sessionWindowOpen(thread?.last_inbound_at ?? null, now),
    tryAfterWindow: thread?.try_after_window,
  };
}

/** Applies the text rule from the cached thread as the Composer does; an unknown chat reads no. */
export function chatMaySend(client: QueryClient, phone: string, now: Date): boolean {
  const data = client.getQueryData<ThreadCache>(threadKey(phone));
  return staffMaySend(sendState(data?.pages[0]?.thread, now), true);
}
