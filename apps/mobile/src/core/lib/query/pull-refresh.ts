import { useCallback, useState } from 'react';

/**
 * Pull to refresh that spins only for the viewer's own pull (owner 2026-10-29: the chat list's loader
 * showed on every new message). TanStack's `isRefetching` is true for ANY background refetch (a poll,
 * a new message invalidating the list), so it must never drive a RefreshControl.
 */
export function usePullRefresh(refetch: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve()
      .then(refetch)
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}
