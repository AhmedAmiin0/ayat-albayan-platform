import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { addDays, riyadhToday, weekStart } from '@/calendar/week';
import type { DashboardWork, Summary } from './dashboard-types';

/** The Riyadh week (Saturday → Friday) holding `now`: the range of the web's KPI strip. */
export function weekRange(now: Date): { from: string; to: string } {
  const from = weekStart(riyadhToday(now));
  return { from, to: addDays(from, 6) };
}

/** GET /dashboard/summary?from&to (admin): counts from statuses. */
export function useSummary(range: { from: string; to: string }) {
  const path = `/dashboard/summary${toQueryString(range)}`;
  return useQuery({
    queryKey: [...pathKey('/dashboard/summary'), range],
    queryFn: () => apiFetch<Summary>(path),
  });
}

/** GET /dashboard/work: pending reports, unpaid packages and open tasks, oldest first. */
export function useWork() {
  return useQuery({
    queryKey: pathKey('/dashboard/work'),
    queryFn: () => apiFetch<DashboardWork>('/dashboard/work'),
  });
}
