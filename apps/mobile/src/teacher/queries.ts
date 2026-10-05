import type { LessonView, PayoutView, PendingReportView, TeacherMe } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import type { AvailabilityRow } from '@/more/types';

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

/**
 * GET /teachers/me/lessons?from&to (≤ 31 days, every status). Keyed under ['lessons'] so «تأكيد»
 * (useLessonAction, path /lessons) patches it at once and every lesson change refetches it.
 */
export function useMyLessons(window: { from: string; to: string }) {
  return useQuery({
    queryKey: [...pathKey('/lessons'), 'mine', window],
    queryFn: () => apiFetch<LessonView[]>(`${ME}/lessons${toQueryString(window)}`),
  });
}

/** GET /teachers/me/pending-reports: started lessons still missing a sent report, oldest first. */
export function usePendingReports() {
  const path = `${ME}/pending-reports`;
  return useQuery({ queryKey: [...pathKey('/reports'), 'pending'], queryFn: () => apiFetch<PendingReportView[]>(path) });
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
