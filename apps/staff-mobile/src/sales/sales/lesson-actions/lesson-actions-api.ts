import type {
  SalesCancel,
  SalesLessonMoved,
  SalesReschedule,
  SalesScheduleLesson,
} from '@ab/shared';
import type { LessonStatus } from '@ab/catalog';
import { isOpenLesson, type CorrectTo } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, pathKey } from '@ab/mobile-kit';

/** Any open, not-over lesson with a student and her key (docs/16 row 37); the API re-checks. */
export function canChangeLesson(lesson: SalesScheduleLesson, input: { now: Date; can: (key: 'lessons.reschedule' | 'lessons.cancel') => boolean }) {
  const ok = isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) > input.now.getTime() && lesson.students.length > 0;
  return { reschedule: ok && input.can('lessons.reschedule'), cancel: ok && input.can('lessons.cancel') };
}

/** Schedule, today and student details share the day query, so refetch both after a change. */
const useRefreshSchedule = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: pathKey('/sales/schedule') }),
      client.invalidateQueries({ queryKey: pathKey('/sales/students') }),
    ]);
};

/** POST /sales/lessons/:id/reschedule { startsAt, reason? }: the admin's one-lesson move (confirmation to the family queued). */
export function useSalesReschedule(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (body: SalesReschedule) => apiSend<SalesLessonMoved>('POST', `/sales/lessons/${lessonId}/reschedule`, body),
    onSuccess: refresh,
  });
}

/** POST /sales/lessons/:id/confirm: scheduled → confirmed, ANY lesson (owner 2026-10-28), no message to anyone. */
export function useSalesConfirm(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: () => apiSend<SalesLessonMoved>('POST', `/sales/lessons/${lessonId}/confirm`),
    // A 409 (cancelled or confirmed elsewhere) refetches too, so the stale button and status go.
    onSettled: refresh,
  });
}

/** This lesson only, cancelled by the academy, with no message to the family. */
export function useSalesCancel(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (body: SalesCancel) => apiSend<{ id: string; status: LessonStatus }>('POST', `/sales/lessons/${lessonId}/cancel`, body),
    onSuccess: refresh,
  });
}

export function useSalesCorrect(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (to: CorrectTo) => apiSend('POST', `/sales/lessons/${lessonId}/correct`, { to }),
    onSettled: refresh,
  });
}
