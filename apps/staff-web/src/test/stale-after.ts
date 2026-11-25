import { QueryClient, type QueryKey } from '@tanstack/react-query';

// Caches every key, invalidates `root` without refetching, and returns the keys it marked stale.
export async function staleAfter(keys: readonly QueryKey[], root: QueryKey): Promise<QueryKey[]> {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 'cached'));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated === true);
}
