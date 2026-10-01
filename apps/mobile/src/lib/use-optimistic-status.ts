import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from './api';
import { patchCached } from './paging';
import { pathKey } from './query-keys';

export interface StatusChange<S extends string> {
  id: string;
  status: S;
}

export interface OptimisticStatusOptions {
  /** Resource path, e.g. '/leads' → PATCH /leads/:id/status { status }. Also the cache key. */
  path: string;
  /** PATCH URL for one row when the resource has no /status route, e.g. students: (id) => `/students/${id}`. */
  patchPath?: (id: string) => string;
}

/**
 * Optimistic status change (R-MOB-03): every cached list page and detail under the resource shows
 * the new status at once; on failure the snapshot comes back; either way the resource refetches,
 * lists before details.
 * `mutate({ id, status })`. Show the error yourself (`isError`); the row has already rolled back.
 */
export function useOptimisticStatus<S extends string>({ path, patchPath }: OptimisticStatusOptions) {
  const client = useQueryClient();
  const queryKey = pathKey(path);
  const urlOf = patchPath ?? ((id: string) => `${path}/${id}/status`);
  return useMutation({
    mutationFn: ({ id, status }: StatusChange<S>) => apiSend<unknown>('PATCH', urlOf(id), { status }),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey });
      const snapshot = client.getQueriesData({ queryKey });
      client.setQueriesData({ queryKey }, (old: unknown) => patchCached(old, { ...change }));
      return { snapshot };
    },
    onError: (_error, _change, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    // Lists first: the lead screen reads its lead out of the cached lists, so after a refused move
    // it must see the server's status, not the rolled-back one. Then everything else under it.
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: [...queryKey, 'list'] });
      await client.invalidateQueries({ queryKey, predicate: (q) => q.queryKey[1] !== 'list' });
    },
  });
}
