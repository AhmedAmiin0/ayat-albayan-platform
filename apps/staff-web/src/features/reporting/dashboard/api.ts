import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import type { DashboardData, DashboardWork, DayRange } from './types';

// The /admin dashboard (docs/11 §9 D1; R-RPT-01, R-RPT-02).

export const DASHBOARD_KEY = ['dashboard'] as const;

/** GET /dashboard/summary?from&to: refetches keep the previous numbers on screen (no flash). */
export const summaryQuery = (r: DayRange) =>
  queryOptions({
    queryKey: [...DASHBOARD_KEY, 'summary', r.from, r.to],
    queryFn: () => apiFetch<DashboardData>(`/dashboard/summary?${new URLSearchParams(r)}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

/** GET /dashboard/work: pending reports, unpaid packages and open admin tasks. */
export const workQuery = queryOptions({
  queryKey: [...DASHBOARD_KEY, 'work'],
  queryFn: () => apiFetch<DashboardWork>('/dashboard/work'),
  staleTime: 60_000,
});

/** POST /admin-tasks/:id/done (docs/11 S8, the money module). */
export const markTaskDone = (id: string) => apiSend('POST', `/admin-tasks/${id}/done`);
