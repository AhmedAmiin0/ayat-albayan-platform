import { activityCalls } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ListUrlState } from '@/lib/list/list-url';
import { activityKeys } from '@/features/reporting/keys';

export const ACTIVITY_PAGE_SIZE = 25;

export interface ActivityScope {
  entity: string;
  entityId: string;
}

const activity = activityCalls({ apiFetch, apiSend });

const scopeQuery = (scope?: ActivityScope) =>
  scope ? { entity: scope.entity, entity_id: scope.entityId } : {};

/** GET /activity: page, column sort and filters (R-NFR-08), optionally scoped to one entity. */
export const activityQuery = (s: ListUrlState, scope?: ActivityScope) =>
  queryOptions({
    queryKey: activityKeys.list(s, scope),
    queryFn: () =>
      activity.list({
        page: s.page,
        pageSize: ACTIVITY_PAGE_SIZE,
        ...Object.fromEntries(sortFilterParams(s.sort, s.filters)),
        ...scopeQuery(scope),
      }),
    placeholderData: keepPreviousData,
  });
