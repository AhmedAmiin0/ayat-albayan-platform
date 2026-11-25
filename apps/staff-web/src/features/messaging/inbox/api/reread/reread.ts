import type { ThreadPages } from '@ab/client-core';
import type { Query, QueryClient } from '@tanstack/react-query';
import { threadKeys } from '@/features/messaging/inbox/api/keys';
import { threadQuery } from '@/features/messaging/inbox/api/thread-query';

// docs/44 K1: re-reads cancel older reads but wait for chat loads in flight (thread-delta.ts).

const fetching = (query: Query) => query.state.fetchStatus === 'fetching';

/** A first load in flight: joined by a refetch (no data to cancel), so a re-read follows it. */
const firstLoad = (query: Query) => fetching(query) && query.state.data === undefined;

/** A page load in flight (fetchMeta outlives it, so a settled one holds no later event back). */
const pageLoad = (query: Query) => fetching(query) && Boolean(query.state.fetchMeta?.fetchMore);

/** Loads a re-read is already chained onto: one chained re-read per load is enough. */
const chained = new WeakSet<Promise<unknown>>();

type Reread = () => Promise<unknown>;

/** Runs `reread` once `load` settles, at most once per load. */
function after(load: Promise<unknown> | undefined, reread: Reread): void {
  if (!load || chained.has(load)) return;
  chained.add(load);
  void load.catch(() => undefined).then(reread);
}

/** Chains `reread` after the load in flight on `query` when `loading` says one runs. */
function waits(query: Query | undefined, loading: (q: Query) => boolean, reread: Reread): boolean {
  const busy = query !== undefined && loading(query);
  if (busy) after(query.promise, reread);
  return busy;
}

/** A loaded chat with no row has no `after` for a delta: only a whole read shows its first row. */
const unanchored = (pages: ThreadPages | undefined): boolean =>
  pages?.pages[0]?.messages.length === 0;

type Read = (client: QueryClient, phone: string) => Promise<unknown>;

const READS: Record<'delta' | 'whole', Read> = {
  // Run on the query itself: its observer may not be enabled yet right after a first load.
  delta: (client, phone) =>
    client
      .getQueryCache()
      .find({ queryKey: threadKeys.delta(phone), exact: true })
      ?.fetch(undefined, { cancelRefetch: true })
      .catch(() => undefined) ?? Promise.resolve(),
  whole: (client, phone) =>
    client.refetchQueries(
      { queryKey: threadQuery(phone).queryKey, exact: true, type: 'active' },
      { cancelRefetch: true },
    ),
};

/**
 * A live event on the chat of `phone`: its delta (~2 rows), never every loaded page again; the
 * whole thread is read only when the delta leaves a gap (thread-delta.ts) or no row anchors
 * it. A thread read in flight is waited for, as is a page load started during the delta. Only
 * while this window has focus, checked when the read starts (both reads stamp read_at): a skipped
 * one is made up by the chat's focus re-read (useWindowFocus).
 */
export function rereadChat(client: QueryClient, phone: string): void {
  const { queryKey } = threadQuery(phone);
  const find = () => client.getQueryCache().find({ queryKey, exact: true });
  const reread = (): Promise<unknown> => {
    if (!document.hasFocus()) return Promise.resolve();
    const read = READS[unanchored(client.getQueryData(queryKey)) ? 'whole' : 'delta'];
    return read(client, phone).then(() => {
      waits(find(), pageLoad, reread);
    });
  };
  if (!waits(find(), fetching, reread)) void reread();
}

/** The mounted chats lists (a web page shows only mounted queries). */
const LISTS = { queryKey: threadKeys.lists, type: 'active' } as const;

/**
 * Re-reads the shown chats lists now (cancelRefetch: true). A list still on its first load is
 * joined by that read (nothing to cancel), so one more read of it follows that load (once each).
 */
export function rereadList(client: QueryClient): void {
  const loading = client.getQueryCache().findAll(LISTS).filter(firstLoad);
  void client.refetchQueries(LISTS, { cancelRefetch: true });
  loading.forEach((query) => {
    const exact = { queryKey: query.queryKey, exact: true, type: 'active' } as const;
    after(query.promise, () => client.refetchQueries(exact, { cancelRefetch: true }));
  });
}
