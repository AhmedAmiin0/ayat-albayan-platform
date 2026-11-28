import type { LessonProposalRequest, LessonView, TeacherMe } from '@ab/schedule';
import { myPayoutCalls, TEACHER_REFRESH_MS } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { lessonKeys, type Window } from '@/features/teaching/schedule';
import { moneyKeys } from '@/features/finance/keys';
import { teacherKeys } from '@/features/people/keys';
import { apiFetch, apiSend } from '@ab/web-kit';

// Teacher self-service routes (docs/10 §5 rows 3–4; R-TCH-03, R-SCH-08).

/** GET /teachers/me — 404 `teacher_not_linked` when the login has no teachers row. */
export const teacherMeQuery = queryOptions({
  queryKey: teacherKeys.me(),
  queryFn: () => apiFetch<TeacherMe>('/teachers/me'),
  retry: false,
});

/**
 * GET /teachers/me/lessons?from&to — own lessons only, every status. Polled every 30 s (docs/48),
 * paused by TanStack on a hidden tab (refetchIntervalInBackground is false).
 */
export const myLessonsQuery = (w: Window) => {
  const params = new URLSearchParams({ from: w.from.toISOString(), to: w.to.toISOString() });
  return queryOptions({
    queryKey: lessonKeys.mine(params.toString()),
    queryFn: () => apiFetch<LessonView[]>(`/teachers/me/lessons?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: TEACHER_REFRESH_MS,
  });
};

/** POST /lessons/:id/propose: a new time for the admin to approve (R-SCH-08). */
export const proposeLesson = ({ id, body }: { id: string; body: LessonProposalRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/propose`, body);

/** GET /teachers/me/payouts — every month of mine, newest first (R-TCH-04). */
export const myPayoutsQuery = queryOptions({
  queryKey: moneyKeys.myPayouts(),
  queryFn: myPayoutCalls({ apiFetch, apiSend }).list,
});
