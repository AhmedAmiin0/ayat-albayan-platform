import {
  coursePauseKey,
  coursePausePath,
  coursePausePreviewPath,
  coursePauseResumePath,
  coursePauseUntilPath,
} from '@ab/client-core';
import type { CoursePausePreview, CoursePauseResult, CoursePauseStart, CoursePauseState } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

// «إيقاف مؤقت» (owner 2026-10-28, docs/11 §7b): the same routes in the admin and the sales trees
// (courses.pause); the paths and the key are @ab/client-core's, shared with web.

/** GET /students/:id/course-pause: the open pause (or null) and the past ones. */
export const useCoursePause = (studentId: string) =>
  useQuery({
    queryKey: coursePauseKey(studentId),
    queryFn: () => apiFetch<CoursePauseState>(coursePausePath(studentId)),
    enabled: studentId !== '',
  });

/** GET …/preview?from=&until=: how many lessons the window takes the student out of. */
export const usePausePreview = (input: { studentId: string; from: string; until: string | null }) =>
  useQuery({
    queryKey: [...coursePauseKey(input.studentId), 'preview', input.from, input.until],
    queryFn: () => apiFetch<CoursePausePreview>(coursePausePreviewPath(input)),
  });

/**
 * After a write: the pause state, the student's file and lists (the status chip «موقوف مؤقتًا»), and
 * sales' schedule / «تفاصيل الطالب» (lessons cancelled or booked back).
 */
function useRefresh(studentId: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: coursePauseKey(studentId) }),
      client.invalidateQueries({ queryKey: pathKey('/students') }),
      client.invalidateQueries({ queryKey: pathKey('/sales') }),
      client.invalidateQueries({ queryKey: pathKey('/lessons') }),
    ]);
}

/** POST /students/:id/course-pause { fromDate, untilDate, reason }. Never a message to the family. */
export function useStartPause(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: (body: CoursePauseStart) => apiSend<CoursePauseResult>('POST', coursePausePath(studentId), body),
    onSuccess: refresh,
  });
}

/** PATCH …/until { untilDate } (null = until «استئناف»). */
export function useChangeUntil(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: (untilDate: string | null) => apiSend<CoursePauseResult>('PATCH', coursePauseUntilPath(studentId), { untilDate }),
    onSuccess: refresh,
  });
}

/** POST …/resume: the lessons come back from today; `conflicts` = clashes of those booked back. */
export function useResumePause(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: () => apiSend<CoursePauseResult>('POST', coursePauseResumePath(studentId)),
    // A 409 (already resumed elsewhere) refetches too, so the stale banner goes.
    onSettled: refresh,
  });
}
