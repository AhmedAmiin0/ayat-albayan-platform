import { parseThreadSync, threadSyncCalls } from '@ab/client-core';
import { SYNC_LIMIT_DEFAULT, type ThreadSync } from '@ab/shared';
import { apiFetch, apiSend } from '@ab/mobile-kit';

const syncs = threadSyncCalls({ apiFetch, apiSend });

/**
 * One page from `since` (none on a first sync): the route reads the envelope, parseThreadSync
 * types its rows. A page that lands after stop() is never written (the engine checks its signal).
 */
export async function fetchSyncPage(since: string | undefined): Promise<ThreadSync> {
  return parseThreadSync(await syncs.sync({ since, limit: SYNC_LIMIT_DEFAULT }));
}
