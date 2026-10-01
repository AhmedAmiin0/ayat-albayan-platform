import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from './api';
import { patchCached } from './paging';
import { pathKey } from './query-keys';

export interface StatusChange<S extends string> {
  id: string;
  status: S;
}

export interface OptimisticStatusOptions {
  /** Resource path, e.g. '/leads' → PATCH /leads/:id/status { status }. */
  path: string;
}

/**
 * Optimistic status change (R-MOB-03): every cached list page and detail under the resource shows
 * the new status at once; on failure the snapshot comes back; either way the resource refetches.
 * `mutate({ id, status })`. Show the error yourself (`isError`); the row has already rolled back.
 */
export function useOptimisticStatus<S extends string>({ path }: OptimisticStatusOptions) {
  const client = useQueryClient();
  const queryKey = pathKey(path);
  return useMutation({
    mutationFn: ({ id, status }: StatusChange<S>) =>
      apiSend<unknown>('PATCH', `${path}/${id}/status`, { status }),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey });
      const snapshot = client.getQueriesData({ queryKey });
      client.setQueriesData({ queryKey }, (old: unknown) => patchCached(old, { ...change }));
      return { snapshot };
    },
    onError: (_error, _change, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}
