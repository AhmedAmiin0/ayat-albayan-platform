import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query';

// Which chats lists are on screen, and when a change last left the hidden ones behind (docs/43
// 43-1, AU1, AU2). A hidden list is never re-read on a send, an opened chat or an event: its read
// in flight is cancelled (its older answer would land after the mark and hide it) and the time is
// kept; back on screen it reads again when its data is older than that mark. A list on screen
// joins its read in flight (never cancelled, so a slow multi-page read is never starved) and then
// reads once more: the older answer never has the last word. A list that brings its page-1 read
// (readListHead) re-reads page 1 only: every loaded page in sequence made the list seconds late.

const LISTS = ['threads', 'list'];
type HeadRead = () => Promise<void>;
const shown = new Map<string, { key: QueryKey; count: number; head?: HeadRead | undefined }>();
const following = new Set<string>();
const pending = new Set<string>();
let markedAt = 0;

/** This list is on screen until the release (useListCatchUp); `head` re-reads its page 1. */
export function showList(queryKey: QueryKey, head?: HeadRead): () => void {
  const hash = hashKey(queryKey);
  const count = (shown.get(hash)?.count ?? 0) + 1;
  shown.set(hash, { key: queryKey, count, head });
  return () => {
    const left = (shown.get(hash)?.count ?? 1) - 1;
    if (left > 0) shown.set(hash, { key: queryKey, count: left, head });
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
 * during the first read fold into that follow-up; a call during the follow-up starts its own round.
 * With `head` every read it starts is page 1 alone: a full read is only ever joined, never chained.
 */
export async function rereadList(
  client: QueryClient,
  queryKey: QueryKey,
  head?: HeadRead,
): Promise<void> {
  const hash = hashKey(queryKey);
  if (following.has(hash)) {
    pending.add(hash); // a change during the read: it gets the follow-up too
    return;
  }
  const full = () => client.refetchQueries({ queryKey, exact: true }, { cancelRefetch: false });
  const read = head ?? full;
  const joined = fetching(client, queryKey);
  following.add(hash);
  await (joined ? full() : read());
  following.delete(hash);
  const changedMeanwhile = pending.delete(hash);
  if (joined || changedMeanwhile) await read();
}

/** A change for every chats list: the shown ones re-read, the hidden ones are marked and wait. */
export function changeLists(client: QueryClient): void {
  markedAt = Date.now();
  const isHidden = (q: { queryHash: string }) => !shown.has(q.queryHash);
  const hidden = { queryKey: LISTS, predicate: isHidden };
  void client.cancelQueries(hidden);
  void client.invalidateQueries({ queryKey: LISTS, refetchType: 'none' });
  shown.forEach(({ key, head }) => void rereadList(client, key, head));
}
