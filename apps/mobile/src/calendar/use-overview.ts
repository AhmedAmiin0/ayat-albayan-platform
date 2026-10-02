import type { ScheduleOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

/**
 * GET /lessons/overview?from&to (admin, ≤ 31 days): one Riyadh week of every teacher and lesson.
 * Key ['lessons', 'overview', { from, to }]: a lesson's confirm / cancel / reschedule patches and
 * refetches it with everything under ['lessons'], and the persisted cache keeps the last week for
 * an offline start (R-MOB-03). Moving between the week's days reads the same entry.
 */
export function useOverview(window: { from: string; to: string }) {
  return useQuery({
    queryKey: [...pathKey('/lessons/overview'), window],
    queryFn: () => apiFetch<ScheduleOverview>(`/lessons/overview${toQueryString({ ...window })}`),
  });
}
