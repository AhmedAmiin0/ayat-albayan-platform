import type { LessonProposalRequest, LessonView, TeacherMe } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { LESSONS_KEY, type Window } from '@/features/schedule/api';
import { apiFetch, apiSend } from '@/lib/api';

// Teacher self-service routes (docs/10 §5 rows 3–4; R-TCH-03, R-SCH-08).

/** GET /teachers/me — 404 `teacher_not_linked` when the login has no teachers row. */
export const teacherMeQuery = queryOptions({
  queryKey: ['teachers', 'me'],
  queryFn: () => apiFetch<TeacherMe>('/teachers/me'),
  retry: false,
});

/** GET /teachers/me/lessons?from&to — own lessons only, every status. */
export const myLessonsQuery = (w: Window) => {
  const params = new URLSearchParams({ from: w.from.toISOString(), to: w.to.toISOString() });
  return queryOptions({
    queryKey: [...LESSONS_KEY, 'mine', params.toString()],
    queryFn: () => apiFetch<LessonView[]>(`/teachers/me/lessons?${params}`),
    placeholderData: keepPreviousData,
  });
};

/** POST /lessons/:id/propose — «اقترح ميعاد تاني» for the admin to approve (R-SCH-08). */
export const proposeLesson = ({ id, body }: { id: string; body: LessonProposalRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/propose`, body);
