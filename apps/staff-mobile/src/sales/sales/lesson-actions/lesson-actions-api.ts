import { salesLessonActionCalls } from '@ab/client-core';
import type { SalesCancel, SalesReschedule, SalesScheduleLesson } from '@ab/shared';
import { isOpenLesson, type CorrectTo } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const lessons = salesLessonActionCalls({ apiFetch, apiSend });

/** Any open, not-over lesson with a student and her key (docs/16 row 37); the API re-checks. */
export function canChangeLesson(
  lesson: SalesScheduleLesson,
  input: { now: Date; can: (key: 'lessons.reschedule' | 'lessons.cancel') => boolean },
) {
  const ok =
    isOpenLesson(lesson.status) &&
    Date.parse(lesson.ends_at) > input.now.getTime() &&
    lesson.students.length > 0;
  return {
    reschedule: ok && input.can('lessons.reschedule'),
    cancel: ok && input.can('lessons.cancel'),
  };
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

/** The admin's one-lesson move; the confirmation to the family is queued. */
export function useSalesReschedule(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (body: SalesReschedule) => lessons.reschedule({ lessonId, body }),
    onSuccess: refresh,
  });
}

/** Scheduled → confirmed, ANY lesson, no message to anyone. */
export function useSalesConfirm(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: () => lessons.confirm(lessonId),
    // A 409 (cancelled or confirmed elsewhere) refetches too, so the stale button and status go.
    onSettled: refresh,
  });
}

/** This lesson only, cancelled by the academy, with no message to the family. */
export function useSalesCancel(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (body: SalesCancel) => lessons.cancel({ lessonId, body }),
    onSuccess: refresh,
  });
}

export function useSalesCorrect(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (to: CorrectTo) => lessons.correct({ lessonId, body: { to } }),
    onSettled: refresh,
  });
}
