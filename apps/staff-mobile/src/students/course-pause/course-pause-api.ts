import { courseActionsKey, coursePauseCalls, coursePauseKey, pauseKeys } from '@ab/client-core';
import type { CoursePauseStart } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

// Course pause (docs/11 §7b): same routes in admin and sales trees (courses.pause).

const pauses = coursePauseCalls({ apiFetch, apiSend });

/** GET /students/:id/course-pause: the open pause (or null) and the past ones. */
export const useCoursePause = (studentId: string) =>
  useQuery({
    queryKey: coursePauseKey(studentId),
    queryFn: () => pauses.state(studentId),
    enabled: studentId !== '',
  });

/** GET …/preview?from=&until=: how many lessons the window takes the student out of. */
export const usePausePreview = (input: { studentId: string; from: string; until: string | null }) =>
  useQuery({
    queryKey: pauseKeys.preview(input),
    queryFn: () => pauses.preview(input),
  });

/** Lessons are cancelled or booked back, so sales' schedule and details refresh too. */
function useRefresh(studentId: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: coursePauseKey(studentId) }),
      client.invalidateQueries({ queryKey: courseActionsKey(studentId) }),
      client.invalidateQueries({ queryKey: pathKey('/students') }),
      client.invalidateQueries({ queryKey: pathKey('/sales') }),
      client.invalidateQueries({ queryKey: pathKey('/lessons') }),
    ]);
}

/** POST /students/:id/course-pause; it never sends the family a message. */
export function useStartPause(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: (body: CoursePauseStart) => pauses.start(studentId, body),
    onSuccess: refresh,
  });
}

/** A null untilDate means until resume. */
export function useChangeUntil(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: (untilDate: string | null) => pauses.until(studentId, untilDate),
    onSuccess: refresh,
  });
}

/** POST …/resume: the lessons come back from today; `conflicts` = clashes of those booked back. */
export function useResumePause(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: () => pauses.resume(studentId),
    // A 409 (already resumed elsewhere) refetches too, so the stale banner goes.
    onSettled: refresh,
  });
}
