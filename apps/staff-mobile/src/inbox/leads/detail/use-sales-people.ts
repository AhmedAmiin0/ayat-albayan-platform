import { salesAssignCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { withTracked } from '@/core/lib/query/paged-result';

const PATH = '/sales/people';
const salesAssign = salesAssignCalls({ apiFetch, apiSend });

/** GET /sales/people (admin, leads.assign): the salespeople. Same key as the web, so one refetch covers both. */
export function useSalesPeople(enabled: boolean) {
  const query = useQuery({
    queryKey: pathKey(PATH),
    queryFn: () => salesAssign.people(),
    enabled,
  });
  return withTracked(query, { people: query.data ?? [] });
}

/** POST /leads/assign-unassigned (admin): every ownerless lead to the then least loaded. */
export const assignAllUnassigned = () => salesAssign.assignUnassigned();
