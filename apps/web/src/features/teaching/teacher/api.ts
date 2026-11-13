import type { LessonProposalRequest, LessonView, PayoutView, TeacherMe } from '@ab/shared';
import { TEACHER_REFRESH_MS } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { LESSONS_KEY, type Window } from '@/features/teaching/schedule';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiFetch, apiSend } from '@/lib/http/api';

// Teacher self-service routes (docs/10 §5 rows 3–4; R-TCH-03, R-SCH-08).

/** GET /teachers/me — 404 `teacher_not_linked` when the login has no teachers row. */
export const teacherMeQuery = queryOptions({
  queryKey: ['teachers', 'me'],
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
    queryKey: [...LESSONS_KEY, 'mine', params.toString()],
    queryFn: () => apiFetch<LessonView[]>(`/teachers/me/lessons?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: TEACHER_REFRESH_MS,
  });
};

/** POST /lessons/:id/propose — «اقترح ميعاد تاني» for the admin to approve (R-SCH-08). */
export const proposeLesson = ({ id, body }: { id: string; body: LessonProposalRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/propose`, body);

/** GET /teachers/me/payouts — every month of mine, newest first (R-TCH-04). */
export const myPayoutsQuery = queryOptions({
  queryKey: [...MONEY_KEY, 'payouts', 'mine'],
  queryFn: () => apiFetch<PayoutView[]>('/teachers/me/payouts'),
});
