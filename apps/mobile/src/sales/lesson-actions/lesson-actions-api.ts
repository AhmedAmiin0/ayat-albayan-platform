import { isOpenLesson, type LessonStatus, type SalesCancel, type SalesLessonMoved, type SalesScheduleLesson } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

/**
 * May she move or cancel this lesson (docs/16 row 37)? It must be open, not over, have only HER
 * students (`mine`; a group with another family's child stays the admin's) and she must hold the key. The API checks every one of these again.
 */
export function canChangeLesson(lesson: SalesScheduleLesson, input: { now: Date; can: (key: 'lessons.reschedule' | 'lessons.cancel') => boolean }) {
  const ok = isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) > input.now.getTime() && lesson.students.length > 0 && lesson.students.every((s) => s.mine === true);
  return { reschedule: ok && input.can('lessons.reschedule'), cancel: ok && input.can('lessons.cancel') };
}

/** «جدول الحلقات» and «اليوم» read the same day query, «تفاصيل الطالب» its «الجدول»: refetch both after a change. */
const useRefreshSchedule = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: pathKey('/sales/schedule') }),
      client.invalidateQueries({ queryKey: pathKey('/sales/students') }),
    ]);
};

/** POST /sales/lessons/:id/reschedule { startsAt }: the admin's one-lesson move (confirmation to the family queued). */
export function useSalesReschedule(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (startsAt: string) => apiSend<SalesLessonMoved>('POST', `/sales/lessons/${lessonId}/reschedule`, { startsAt }),
    onSuccess: refresh,
  });
}

/** POST /sales/lessons/:id/confirm: scheduled → confirmed, ANY lesson (owner 2026-10-28), no message to anyone. */
export function useSalesConfirm(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: () => apiSend<SalesLessonMoved>('POST', `/sales/lessons/${lessonId}/confirm`),
    onSuccess: refresh,
  });
}

/** POST /sales/lessons/:id/cancel { reason? }: this lesson only, «ألغتها الإدارة», no message to the family. */
export function useSalesCancel(lessonId: string) {
  const refresh = useRefreshSchedule();
  return useMutation({
    mutationFn: (body: SalesCancel) => apiSend<{ id: string; status: LessonStatus }>('POST', `/sales/lessons/${lessonId}/cancel`, body),
    onSuccess: refresh,
  });
}
