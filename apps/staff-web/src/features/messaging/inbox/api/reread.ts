import type { Query, QueryClient } from '@tanstack/react-query';
import { threadQuery } from './thread-query';

// docs/44 K1: the re-reads a live event runs. Each starts after the event (cancelRefetch: true: an
// older read in flight is cancelled, never joined), except for loads that must not be cancelled nor
// joined: a chat page load («تحميل الأقدم»: query-core cancels a fetchNextPage for a cancelRefetch
// read) and a first load (joining it would leave the event's change missing until the next poll).
// The re-read then waits for that load to settle and runs once after it.

const fetching = (query: Query) => query.state.fetchStatus === 'fetching';

/** A first load in flight: joined by a refetch (no data to cancel), so a re-read follows it. */
const firstLoad = (query: Query) => fetching(query) && query.state.data === undefined;

/**
 * A chat load in flight the re-read waits for: a page load or a first load (fetchMeta outlives the
 * page load, so a settled one never holds a later event's re-read back).
 */
const mustWait = (query: Query) =>
  firstLoad(query) || (fetching(query) && Boolean(query.state.fetchMeta?.fetchMore));

/** Loads a re-read is already chained onto: one chained re-read per load is enough. */
const chained = new WeakSet<Promise<unknown>>();

type Reread = () => Promise<unknown>;

/** Runs `reread` once `load` settles, at most once per load. */
function after(load: Promise<unknown> | undefined, reread: Reread): void {
  if (!load || chained.has(load)) return;
  chained.add(load);
  void load.catch(() => undefined).then(reread);
}

/**
 * Re-reads the chat of `phone` now, or right after the page / first load in flight. Only while this
 * window has focus, checked when the read starts (a full read stamps read_at and sends Meta a read
 * receipt): a skipped one is made up by the chat's focus re-read (useWindowFocus).
 */
export function rereadChat(client: QueryClient, phone: string): void {
  const filters = { queryKey: ['threads', 'detail', phone], type: 'active' } as const;
  const find = () =>
    client.getQueryCache().find({ queryKey: threadQuery(phone).queryKey, exact: true });
  // A page load started during the re-read cancels it (fetchNextPage's cancelRefetch) and commits
  // pages built on the old ones: the re-read runs once more after it (one per «تحميل الأقدم»).
  // Only a NEW page load counts (each fetchNextPage dispatches its own fetchMeta object; an older
  // one stays in state, and leaving the chat reverts to it), and only while the chat is shown.
  const metaNow = () => find()?.state.fetchMeta;
  const replacedSince = (before: unknown) => {
    const meta = metaNow();
    return Boolean(find()?.isActive() && meta?.fetchMore && meta !== before);
  };
  const read = () => client.refetchQueries(filters, { cancelRefetch: true });
  const reread = (): Promise<unknown> => {
    if (!document.hasFocus()) return Promise.resolve();
    const before = metaNow();
    return read().then(() => (replacedSince(before) ? reread() : undefined));
  };
  const query = find();
  if (query && mustWait(query)) after(query.promise, reread);
  else void reread();
}

/** The mounted chats lists (a web page shows only mounted queries). */
const LISTS = { queryKey: ['threads', 'list'], type: 'active' } as const;

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
