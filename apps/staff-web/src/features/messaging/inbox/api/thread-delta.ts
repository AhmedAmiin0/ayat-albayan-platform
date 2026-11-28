import { deltaQuery, mergeDelta, needsFullRead, type ThreadDeltaQuery } from '@ab/client-core';
import type { ThreadDelta } from '@ab/shared';
import {
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { inboxPollMs, threadReads } from './api';
import { useTicksInLists } from './list-ticks';
import { threadQuery } from './thread-query';
import { threadKeys } from './keys';
import { useLiveChat } from './live';

type Fold = (client: QueryClient, phone: string, delta: ThreadDelta) => void;

/** More new rows than one delta: merging would hide the ones in between, so the thread is read. */
const fold: Record<'full' | 'merge', Fold> = {
  full: (client, phone) => void client.invalidateQueries({ queryKey: threadQuery(phone).queryKey }),
  merge: (client, phone, delta) =>
    client.setQueryData(threadQuery(phone).queryKey, (old) => mergeDelta(old, delta)),
};

/** A thread read or a send in flight answers after this delta and would overwrite its merge. */
const busy = (client: QueryClient, phone: string): boolean =>
  client.isFetching({ queryKey: threadQuery(phone).queryKey }) +
    client.isMutating({ mutationKey: ['inbox-send', phone] }) >
  0;

/** The chat changed since the delta was asked (a full read landed, or a read or send runs). */
const overtaken = (client: QueryClient, phone: string, asked: number | undefined): boolean =>
  busy(client, phone) || client.getQueryState(threadQuery(phone).queryKey)?.dataUpdatedAt !== asked;

const deltaFor = (client: QueryClient, phone: string): ThreadDeltaQuery | null =>
  document.hasFocus()
    ? deltaQuery(client.getQueryData(threadQuery(phone).queryKey), Date.now())
    : null;

/**
 * The open chat's delta read (GET /threads/:phone?after=…, ~2 rows; the server stamps read_at as a
 * full read does). Only while this window has focus: a chat open in a background window never marks
 * new rows read. A chat with no row has no `after`: nothing is read. Returns the time it ran.
 */
async function readThreadDelta(
  client: QueryClient,
  phone: string,
  signal: AbortSignal,
): Promise<number> {
  const query = deltaFor(client, phone);
  if (query === null) return Date.now();
  const asked = client.getQueryState(threadQuery(phone).queryKey)?.dataUpdatedAt;
  const delta = await threadReads.delta({ phone, query, signal });
  // A full read that landed meanwhile is newer than this answer: keep it.
  if (overtaken(client, phone, asked)) return Date.now();
  fold[needsFullRead(delta) ? 'full' : 'merge'](client, phone, delta);
  return Date.now();
}

/**
 * The open chat, live: threadQuery (a full read on open, on window focus and every
 * threadFullRefreshMs) plus a delta (readThreadDelta, ~2 rows) every inboxPollMs while the
 * window has focus: a chat open in a background window never stamps new rows read. A realtime event
 * (docs/12 §15) runs this delta sooner (reread.ts). It keeps a pace while live too (docs/44 BUG5:
 * a socket that died quietly still reads SUBSCRIBED): 20 s while live, 10 s while down (as mobile).
 */
export function useLiveThread(phone: string) {
  const options = threadQuery(phone);
  const detail = useInfiniteQuery(options);
  const client = useQueryClient();
  useLiveChat(phone);
  useTicksInLists(phone, detail.data); // the list beside it shows the same tick (docs/43 43-1)
  useQuery({
    queryKey: threadKeys.delta(phone),
    queryFn: ({ signal }) => readThreadDelta(client, phone, signal),
    enabled: detail.isSuccess,
    // No fetch on open: the thread query just read the whole page.
    initialData: 0,
    staleTime: Infinity,
    gcTime: 0,
    refetchInterval: inboxPollMs,
  });
  return detail;
}
