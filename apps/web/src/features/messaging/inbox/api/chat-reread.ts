import type { Query, QueryClient } from '@tanstack/react-query';
import { threadQuery } from './thread-query';

// docs/44 K1: the open chat's re-read on a live event. It starts after the event (cancelRefetch:
// true: an older read in flight is cancelled, never joined), except for two loads that must not be
// cancelled nor joined: a page load («تحميل الأقدم»: query-core cancels a fetchNextPage for a
// cancelRefetch read, and the page commits its start-time copy of the earlier pages) and a first
// load (joining it would leave the event's change missing until the next poll). The re-read then
// waits for that load to settle.

/** A load the re-read waits for instead of cancelling or joining it. */
const mustWait = (query: Query) =>
  Boolean(query.state.fetchMeta?.fetchMore) ||
  (query.state.data === undefined && query.state.fetchStatus === 'fetching');

/** Loads a re-read is already chained onto: one chained re-read per load is enough. */
const chained = new WeakSet<Promise<unknown>>();

type Reread = () => Promise<void>;

/** Runs `reread` once `load` settles, at most once per load. */
function after(load: Promise<unknown>, reread: Reread): void {
  if (chained.has(load)) return;
  chained.add(load);
  void load.catch(() => undefined).then(reread);
}

/** Re-reads the chat of `phone` now, or right after the page / first load in flight. */
export function rereadChat(client: QueryClient, phone: string): void {
  const filters = { queryKey: ['threads', 'detail', phone], type: 'active' } as const;
  const reread = () => client.refetchQueries(filters, { cancelRefetch: true });
  const query = client.getQueryCache().find({ queryKey: threadQuery(phone).queryKey, exact: true });
  const load = query && mustWait(query) ? query.promise : undefined;
  if (load) after(load, reread);
  else void reread();
}
