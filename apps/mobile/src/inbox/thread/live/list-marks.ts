import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query';

// Which chats lists are on screen, and when a change last left the hidden ones behind (docs/43
// 43-1, AU1, AU2). A hidden list is never re-read on a send, an opened chat or an event: its read
// in flight is cancelled (its older answer would land after the mark and hide it) and the time is
// kept; back on screen it reads again when its data is older than that mark. A list on screen
// joins its read in flight (never cancelled, so a slow multi-page read is never starved) and then
// reads once more: the older answer never has the last word.

const LISTS = ['threads', 'list'];
const shown = new Map<string, { key: QueryKey; count: number }>();
const following = new Set<string>();
const pending = new Set<string>();
let markedAt = 0;

/** This list is on screen until the release (useListCatchUp). */
export function showList(queryKey: QueryKey): () => void {
  const hash = hashKey(queryKey);
  const count = (shown.get(hash)?.count ?? 0) + 1;
  shown.set(hash, { key: queryKey, count });
  return () => {
    const left = (shown.get(hash)?.count ?? 1) - 1;
    if (left > 0) shown.set(hash, { key: queryKey, count: left });
    else shown.delete(hash);
  };
}

/** Its data is older than the last change that came while it was hidden. */
export const missedChange = (client: QueryClient, queryKey: QueryKey): boolean =>
  (client.getQueryState(queryKey)?.dataUpdatedAt ?? 0) < markedAt;

const fetching = (client: QueryClient, queryKey: QueryKey) =>
  client.getQueryState(queryKey)?.fetchStatus === 'fetching';

/**
 * Re-reads one list without starving it: a read in flight is joined, then one more read follows it;
 * with nothing in flight, one read, followed by one more only when a change came during it. Calls
 * meanwhile are folded into that one follow-up.
 */
export async function rereadList(client: QueryClient, queryKey: QueryKey): Promise<void> {
  const hash = hashKey(queryKey);
  if (following.has(hash)) {
    pending.add(hash); // a change during the read: it gets the follow-up too
    return;
  }
  const filters = { queryKey, exact: true };
  const joined = fetching(client, queryKey);
  following.add(hash);
  await client.refetchQueries(filters, { cancelRefetch: false });
  following.delete(hash);
  const changedMeanwhile = pending.delete(hash);
  if (joined || changedMeanwhile) await client.refetchQueries(filters, { cancelRefetch: false });
}

/** A change for every chats list: the shown ones re-read, the hidden ones are marked and wait. */
export function changeLists(client: QueryClient): void {
  markedAt = Date.now();
  const isHidden = (q: { queryHash: string }) => !shown.has(q.queryHash);
  const hidden = { queryKey: LISTS, predicate: isHidden };
  void client.cancelQueries(hidden);
  void client.invalidateQueries({ queryKey: LISTS, refetchType: 'none' });
  shown.forEach(({ key }) => void rereadList(client, key));
}
