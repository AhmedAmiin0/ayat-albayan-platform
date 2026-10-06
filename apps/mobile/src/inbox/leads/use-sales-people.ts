import type { SalesPersonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const PATH = '/sales/people';

/** GET /sales/people (admin, leads.assign): the salespeople. Same key as the web, so one refetch covers both. */
export function useSalesPeople(enabled: boolean) {
  const query = useQuery({
    queryKey: pathKey(PATH),
    queryFn: () => apiFetch<SalesPersonView[]>(PATH),
    enabled,
  });
  return { ...query, people: Array.isArray(query.data) ? query.data : [] };
}
