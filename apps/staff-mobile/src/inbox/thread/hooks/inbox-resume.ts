import type { QueryClient } from '@tanstack/react-query';
import { threadKeys } from '@/core/lib/keys';
import { refreshLists } from './inbox-sync';
import { threadPollsKey } from './thread-poll';

/**
 * Back in the foreground (docs/43 AU3: the one resume path). Reads started before backgrounding
 * may hang and absorb refreshes, so all are cancelled first. Then only what is on screen reads:
 * the open chat's newest page (its poll merges it) and each shown list's page 1 (refreshLists);
 * every other inbox query is marked stale and reads when it shows. Re-reading every loaded page
 * of every list and chat made the return slow.
 */
export async function resumeInbox(client: QueryClient): Promise<void> {
  await client.cancelQueries({ queryKey: threadKeys.all });
  void client.invalidateQueries({ queryKey: threadKeys.all, refetchType: 'none' });
  refreshLists(client);
  await client.refetchQueries({ queryKey: threadPollsKey, type: 'active' });
}
