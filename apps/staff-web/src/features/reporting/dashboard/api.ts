import { adminTaskCalls, dashboardCalls } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import type { DayRange } from './search';
import { dashboardKeys } from '@/features/reporting/keys';

// The /admin dashboard (docs/11 §9 D1; R-RPT-01, R-RPT-02).

export const DASHBOARD_KEY = dashboardKeys.all;

const dashboard = dashboardCalls({ apiFetch, apiSend });

/** GET /dashboard/summary?from&to: refetches keep the previous numbers on screen (no flash). */
export const summaryQuery = (r: DayRange) =>
  queryOptions({
    queryKey: dashboardKeys.summary(r),
    queryFn: () => dashboard.summary(r),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

/** GET /dashboard/work: pending reports, unpaid packages and open admin tasks. */
export const workQuery = queryOptions({
  queryKey: dashboardKeys.work(),
  queryFn: dashboard.work,
  staleTime: 60_000,
});

/** POST /admin-tasks/:id/done (docs/11 S8, the money module). */
export const markTaskDone = adminTaskCalls({ apiFetch, apiSend }).done;
