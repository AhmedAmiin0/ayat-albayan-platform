import { useQuery } from '@tanstack/react-query';
import { dashboardCalls } from '@ab/client-core';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { addDays, riyadhToday, weekStart } from '@/calendar/lib/week';

const dashboard = dashboardCalls({ apiFetch, apiSend });

/** The Riyadh week (Saturday → Friday) holding `now`: the range of the web's KPI strip. */
export function weekRange(now: Date): { from: string; to: string } {
  // academy day (docs/34 b): the dashboard's `?from&to` week is in Riyadh days.
  const from = weekStart(riyadhToday(now));
  return { from, to: addDays(from, 6) };
}

/** GET /dashboard/summary?from&to (admin): counts from statuses. */
export function useSummary(range: { from: string; to: string }) {
  return useQuery({
    queryKey: [...pathKey('/dashboard/summary'), range],
    queryFn: () => dashboard.summary(range),
  });
}

/** GET /dashboard/work: pending reports, unpaid packages and open tasks, oldest first. */
export function useWork() {
  return useQuery({
    queryKey: pathKey('/dashboard/work'),
    queryFn: dashboard.work,
  });
}
