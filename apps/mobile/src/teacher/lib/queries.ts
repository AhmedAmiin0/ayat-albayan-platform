import type { LessonView, PayoutView, PendingReportView, TeacherMe } from '@ab/shared';
import { TEACHER_REFRESH_MS } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch, toQueryString } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import type { AvailabilityRow } from '@/core/lib/staff/types';

// The signed-in teacher's own reads (R-TCH-03, R-TCH-04). Every route is scoped by the session on
// the API (no teacher id to tamper with); the persisted cache keeps them for an offline start.

const ME = '/teachers/me';

/** GET /teachers/me: name, tz, link, students. 404 `teacher_not_linked` without a teachers row. */
export function useTeacherMe(enabled = true) {
  return useQuery({ queryKey: pathKey(ME), queryFn: () => apiFetch<TeacherMe>(ME), enabled });
}

export function isNotLinked(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** `live`: the screen is in front (useScreenFocused), so it re-reads every 30 s (docs/48). */
const pollWhen = (live: boolean) => (live ? TEACHER_REFRESH_MS : false);

/**
 * GET /teachers/me/lessons?from&to (≤ 31 days, every status). Keyed under ['lessons'] so «تأكيد»
 * (useLessonAction, path /lessons) patches it at once and every lesson change refetches it.
 */
export function useMyLessons(window: { from: string; to: string }, live = false) {
  return useQuery({
    queryKey: [...pathKey('/lessons'), 'mine', window],
    queryFn: () => apiFetch<LessonView[]>(`${ME}/lessons${toQueryString(window)}`),
    refetchInterval: pollWhen(live),
  });
}

/** GET /teachers/me/pending-reports: started lessons still missing a sent report, oldest first. */
export function usePendingReports(live = false) {
  const path = `${ME}/pending-reports`;
  return useQuery({
    queryKey: [...pathKey('/reports'), 'pending'],
    queryFn: () => apiFetch<PendingReportView[]>(path),
    refetchInterval: pollWhen(live),
  });
}

/** GET /teachers/me/payouts: my months, newest first (R-TCH-04). */
export function useMyPayouts() {
  const path = `${ME}/payouts`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<PayoutView[]>(path) });
}

/** GET /teachers/:id/availability for me (OwnTeacherGuard), once /teachers/me gave my id. */
export function useMyAvailability(id: string | undefined) {
  const path = `/teachers/${id ?? ''}/availability`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<AvailabilityRow[]>(path), enabled: !!id });
}
