import { teacherLessonCalls } from '@ab/client-core';
import type { TeacherCancelRequest } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiFetch, apiSend } from '@ab/web-kit';
import { patchMyLesson } from '@/features/teaching/teacher/patch-my-lesson';

const lessons = teacherLessonCalls({ apiFetch, apiSend });

/** Teacher cancel before start via her own route (docs/46 C3); write-through cache (docs/48). */
export function useTeacherCancel(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TeacherCancelRequest) => lessons.cancel({ id: lessonId }, body),
    onSuccess: ({ status, cancel_reason }) =>
      patchMyLesson(client, { id: lessonId, patch: { status, cancel_reason } }),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}
