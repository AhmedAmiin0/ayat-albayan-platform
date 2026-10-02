import type { LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import type { AvailabilityRow, Teacher } from '@/more/types';

// Calendar reads. Keys are the API path's segments (lib/query-keys), so a lesson change that
// invalidates ['lessons'] refreshes the week, and the app's persisted cache keeps the last week
// for an offline start (R-MOB-03). The teacher and grid share the teacher screen's keys.

export interface WeekParams {
  from: string;
  to: string;
  teacherId: string;
}

/** GET /lessons?from&to&teacherId (docs/10 route 1): every status in [from, to), ≤ 31 days. */
export function useWeekLessons(params: WeekParams) {
  return useQuery({
    queryKey: [...pathKey('/lessons'), 'list', params],
    queryFn: () => apiFetch<LessonView[]>(`/lessons${toQueryString({ ...params })}`),
  });
}

export function useTeacher(id: string) {
  const path = `/teachers/${id}`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<Teacher>(path) });
}

/** GET /teachers/:id/availability: the weekly grid, wall clock in its own tz. */
export function useAvailability(id: string) {
  const path = `/teachers/${id}/availability`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<AvailabilityRow[]>(path) });
}
