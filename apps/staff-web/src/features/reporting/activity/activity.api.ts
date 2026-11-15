import type { ActivityPage } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ListUrlState } from '@/lib/list/list-url';

export const ACTIVITY_PAGE_SIZE = 25;

/** A fixed entity (a profile's «النشاط»): every row of that student / teacher. */
export interface ActivityScope {
  entity: string;
  entityId: string;
}

/** GET /activity: page, column sort and filters (R-NFR-08), optionally scoped to one entity. */
export const activityQuery = (s: ListUrlState, scope?: ActivityScope) =>
  queryOptions({
    queryKey: ['activity', s, scope ?? null],
    queryFn: () => {
      const qs = new URLSearchParams([
        ['page', String(s.page)],
        ['pageSize', String(ACTIVITY_PAGE_SIZE)],
        ...sortFilterParams(s.sort, s.filters),
      ]);
      if (scope) {
        qs.set('entity', scope.entity);
        qs.set('entity_id', scope.entityId);
      }
      return apiFetch<ActivityPage>(`/activity?${qs}`);
    },
    placeholderData: keepPreviousData,
  });
