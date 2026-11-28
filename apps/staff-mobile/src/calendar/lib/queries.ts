import type { LessonView } from '@ab/schedule';
import { availabilityCalls, teacherCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString, pathKey } from '@ab/mobile-kit';

// Calendar reads. Keys are the API path's segments (lib/query-keys), so a lesson change that
// invalidates ['lessons'] refreshes the week, and the app's persisted cache keeps the last week
// for an offline start (R-MOB-03). The teacher and grid share the teacher screen's keys.

interface WeekParams {
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

const teachers = teacherCalls({ apiFetch, apiSend });
const availability = availabilityCalls({ apiFetch, apiSend });

export function useTeacher(id: string) {
  return useQuery({ queryKey: pathKey(`/teachers/${id}`), queryFn: () => teachers.get(id) });
}

/** GET /teachers/:id/availability: the weekly grid, wall clock in its own tz. */
export function useAvailability(id: string) {
  return useQuery({
    queryKey: pathKey(`/teachers/${id}/availability`),
    queryFn: () => availability.grid(id),
  });
}
