import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { flattenPages, type Page } from '@/lib/paging';
import { pathKey } from '@/lib/query-keys';
import type { Lead } from './types';

/** The lead with this id in any cached inbox list, freshest list first; undefined if none has it. */
export function findCachedLead(client: QueryClient, id: string): Lead | undefined {
  const lists = client
    .getQueryCache()
    .findAll({ queryKey: ['leads', 'list'] })
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);
  for (const list of lists) {
    const data = list.state.data as InfiniteData<Page<Lead>> | undefined;
    const lead = flattenPages(data?.pages ?? []).find((l) => l.id === id);
    if (lead) return lead;
  }
  return undefined;
}

/**
 * One lead for the detail screen, under the detail key ['leads', id] that useOptimisticStatus
 * patches and rolls back. The API has no GET /leads/:id (TODO(R-MOB-02)), so it reads the cached
 * inbox pages. A lead that has left every list (filtered out after a move) keeps its last data.
 */
export function useCachedLead(id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: pathKey(`/leads/${id}`),
    queryFn: () => {
      const lead = findCachedLead(client, id);
      if (!lead) throw new Error('lead_not_cached');
      return lead;
    },
    initialData: () => findCachedLead(client, id),
    retry: false,
  });
}
