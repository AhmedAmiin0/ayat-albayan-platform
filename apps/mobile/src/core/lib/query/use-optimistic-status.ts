import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, type SendMethod } from '../http/api';
import { patchCached } from './paging';
import { pathKey } from './query-keys';

export interface StatusChange<S extends string> {
  id: string;
  status: S;
}

/** One request a change sends, when it is not PATCH { status }. */
export interface StatusRequest {
  method: SendMethod;
  path: string;
  body?: unknown;
}

interface OptimisticStatusOptions<C> {
  /** Resource path, e.g. '/leads' → PATCH /leads/:id/status { status }. Also the cache key. */
  path: string;
  /** PATCH URL for one row when the resource has no /status route, e.g. students: (id) => `/students/${id}`. */
  patchPath?: (id: string) => string;
  /**
   * The whole request for routes of another shape, e.g. lessons: POST /lessons/:id/confirm, or
   * POST /lessons/:id/cancel { scope, by, reason }. Overrides `patchPath`.
   */
  request?: (change: C) => StatusRequest;
}

/**
 * Optimistic status change (R-MOB-03): every cached list page and detail under the resource shows
 * the new status at once; on failure the snapshot comes back; either way the resource refetches,
 * lists before details.
 * `mutate({ id, status })`. Show the error yourself (`isError`); the row has already rolled back.
 * Only `id` and `status` reach the cache; extra fields of the change (a cancel reason) only feed
 * `request`.
 */
export function useOptimisticStatus<
  S extends string,
  C extends StatusChange<S> = StatusChange<S>,
>({ path, patchPath, request }: OptimisticStatusOptions<C>) {
  const client = useQueryClient();
  const queryKey = pathKey(path);
  const urlOf = patchPath ?? ((id: string) => `${path}/${id}/status`);
  const requestOf =
    request ??
    ((c: C): StatusRequest => ({ method: 'PATCH', path: urlOf(c.id), body: { status: c.status } }));
  return useMutation({
    mutationFn: (change: C) => {
      const r = requestOf(change);
      return apiSend<unknown>(r.method, r.path, r.body);
    },
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey });
      const snapshot = client.getQueriesData({ queryKey });
      const patch = { id: change.id, status: change.status };
      client.setQueriesData({ queryKey }, (old: unknown) => patchCached(old, patch));
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
