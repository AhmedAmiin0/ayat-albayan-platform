import { type ListPage, type ListPages, mergeListHead } from '@ab/client-core';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * A chats list's page 1 read again and merged into its cached pages (an event, a return to the
 * list, the app back in the foreground): one small read, where TanStack's refetch reads every
 * loaded page in sequence and shows nothing until the last. A list with nothing loaded yet, or a
 * gap (more new chats than a page), runs the query's own read; a failed read leaves the cache to
 * the polls.
 */
export async function readListHead(
  client: QueryClient,
  queryKey: QueryKey,
  first: () => Promise<ListPage>,
): Promise<void> {
  const full = () => client.refetchQueries({ queryKey, exact: true }, { cancelRefetch: false });
  if (client.getQueryData(queryKey) === undefined) return full();
  const fresh = await first().catch(() => null);
  if (!fresh) return undefined;
  const merged = mergeListHead(client.getQueryData<ListPages>(queryKey), fresh);
  return merged ? void client.setQueryData(queryKey, merged) : full();
}
