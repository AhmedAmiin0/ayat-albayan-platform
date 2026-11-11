import { teacherLessonPaths } from '@ab/client-core';
import type { LessonView, TeacherCancelRequest } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';

const cancelOne = (lessonId: string, body: TeacherCancelRequest): Promise<LessonView> =>
  apiSend('POST', teacherLessonPaths.cancel(lessonId), body);

/**
 * «إلغاء الحلقة» by the teacher (docs/46 C3, D3): this lesson only, a reason, before its start.
 * Her own route, never the admin's /lessons/:id/cancel.
 */
export function useTeacherCancel(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TeacherCancelRequest) => cancelOne(lessonId, body),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}
