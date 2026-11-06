import { parseThreadSync } from '@ab/client-core';
import { SYNC_LIMIT_DEFAULT, type ThreadSync } from '@ab/shared';
import { apiFetch, toQueryString } from '@/core/lib/http/api';

/**
 * GET /threads/sync?since=&limit= (apps/api …/delta/thread-sync.controller.ts): no `since` on a
 * first sync; the answer parsed with the shared schema (sync-wire.ts). Aborted on stop().
 */
export async function fetchSyncPage(
  since: string | undefined,
  signal: AbortSignal,
): Promise<ThreadSync> {
  const query = toQueryString({ since, limit: SYNC_LIMIT_DEFAULT });
  return parseThreadSync(await apiFetch(`/threads/sync${query}`, { signal }));
}
