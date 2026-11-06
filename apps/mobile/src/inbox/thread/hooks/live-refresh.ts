import { deltaSearch } from '@ab/client-core';
import type { QueryClient } from '@tanstack/react-query';
import { threadKey, type ThreadCache } from './thread-cache';
import { threadDeltaKey, threadPollKey } from './thread-poll';

/**
 * A realtime event for the open chat (docs/43 AU5): its delta (~2 small reads: the new rows and the
 * outgoing rows still moving), not a whole newest page. A chat with no row to anchor a delta on (an
 * empty chat) re-reads its page instead, so a first message is never missed. Each runs through
 * useThreadPoll's own query: its merge, its yield to a send, its gap rule.
 */
export function refreshOpenChat(client: QueryClient, phone: string): void {
  const cache = client.getQueryData<ThreadCache>(threadKey(phone));
  const anchored = deltaSearch(cache, Date.now()) !== null;
  const queryKey = anchored ? threadDeltaKey(phone) : threadPollKey(phone);
  void client.refetchQueries({ queryKey });
}
