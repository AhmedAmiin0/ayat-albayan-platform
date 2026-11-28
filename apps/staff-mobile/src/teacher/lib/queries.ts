import { payoutListSchema } from '@ab/money';
import { reportHistoryCalls, TEACHER_REFRESH_MS, teacherLessonCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import type { AvailabilityRow } from '@ab/shared';

// The signed-in teacher's own reads (R-TCH-03, R-TCH-04). Every route is scoped by the session on
// the API (no teacher id to tamper with); the persisted cache keeps them for an offline start.

const ME = '/teachers/me';
const history = reportHistoryCalls({ apiFetch, apiSend });
const lessons = teacherLessonCalls({ apiFetch, apiSend });

/** GET /teachers/me: name, tz, link, students. 404 `teacher_not_linked` without a teachers row. */
export function useTeacherMe(enabled = true) {
  return useQuery({ queryKey: pathKey(ME), queryFn: () => lessons.me(), enabled });
}

export function isNotLinked(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** `live`: the screen is in front (useScreenFocused), so it re-reads every 30 s (docs/48). */
const pollWhen = (live: boolean) => (live ? TEACHER_REFRESH_MS : false);

/** At most 31 days, every status; keyed under ['lessons'] so lesson changes refetch it. */
export function useMyLessons(window: { from: string; to: string }, live = false) {
  return useQuery({
    queryKey: [...pathKey('/lessons'), 'mine', window],
    queryFn: () => lessons.lessons(window),
    refetchInterval: pollWhen(live),
  });
}

/** GET /teachers/me/pending-reports: started lessons still missing a sent report, oldest first. */
export function usePendingReports(live = false) {
  return useQuery({
    queryKey: [...pathKey('/reports'), 'pending'],
    queryFn: () => history.pending(),
    refetchInterval: pollWhen(live),
  });
}

/** GET /teachers/me/payouts: my months, newest first (R-TCH-04). */
export function useMyPayouts() {
  const path = `${ME}/payouts`;
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch(path, { schema: payoutListSchema }),
  });
}

/** GET /teachers/:id/availability for me (OwnTeacherGuard), once /teachers/me gave my id. */
export function useMyAvailability(id: string | undefined) {
  const path = `/teachers/${id ?? ''}/availability`;
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<AvailabilityRow[]>(path),
    enabled: !!id,
  });
}
