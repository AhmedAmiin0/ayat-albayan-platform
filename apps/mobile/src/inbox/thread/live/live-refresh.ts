import { deltaSearch } from '@ab/client-core';
import type { QueryClient } from '@tanstack/react-query';
import { deltaWasEmpty, forgetDelta } from './delta-news';
import { threadKey, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { threadDeltaKey, threadPollKey } from '@/inbox/thread/hooks/thread-poll';

const navCountKey = ['threads', 'nav-count'];

/** The page poll, and the badge: what a delta could not stamp read (an old-dated row) shows. */
async function rereadPage(client: QueryClient, phone: string): Promise<void> {
  await client.refetchQueries({ queryKey: threadPollKey(phone) });
  await client.invalidateQueries({ queryKey: navCountKey }, { cancelRefetch: false });
}

/**
 * A realtime event for the open chat (docs/43 AU5): its delta first (~2 small reads: the new
 * rows and the outgoing rows still moving), not a whole newest page. When that delta brings
 * nothing, the event was about something a delta never carries (an old row's tick, a reaction,
 * a hide): the newest page then re-reads. A chat with no row to anchor a delta on (an empty
 * chat) re-reads its page at once. Each runs through useThreadPoll's own query.
 */
export async function refreshOpenChat(client: QueryClient, phone: string): Promise<void> {
  const cache = client.getQueryData<ThreadCache>(threadKey(phone));
  if (deltaSearch(cache, Date.now()) === null) return rereadPage(client, phone);
  forgetDelta(phone);
  await client.refetchQueries({ queryKey: threadDeltaKey(phone) });
  if (deltaWasEmpty(phone)) await rereadPage(client, phone);
}
