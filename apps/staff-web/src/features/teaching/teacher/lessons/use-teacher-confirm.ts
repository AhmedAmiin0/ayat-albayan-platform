import { teacherLessonCalls } from '@ab/client-core';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiFetch, apiSend } from '@ab/web-kit';
import {
  holdMyLessons,
  patchMyLesson,
  restoreMyLessons,
} from '@/features/teaching/teacher/patch-my-lesson';

const lessons = teacherLessonCalls({ apiFetch, apiSend });

/** One key per lesson so the row and the drawer read the same confirm refusal. */
const confirmKey = (lessonId: string) => ['teacher-confirm', lessonId] as const;

/** Optimistic (docs/48); `onConfirmed` still runs after the patch unmounts the button. */
export function useTeacherConfirm(lessonId: string, onConfirmed?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: confirmKey(lessonId),
    mutationFn: () => lessons.confirm({ id: lessonId }),
    onSuccess: () => onConfirmed?.(),
    onMutate: async () => {
      await holdMyLessons(client);
      const patch = { teacher_confirmed_at: new Date().toISOString() };
      return patchMyLesson(client, { id: lessonId, patch });
    },
    onError: (_error, _vars, snapshot) => restoreMyLessons(client, snapshot),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}

/** Read from the mutation cache because a rolled-back confirm re-mounts the button. */
export function useConfirmError(lessonId: string): unknown {
  const states = useMutationState({
    filters: { mutationKey: confirmKey(lessonId) },
    select: (m) => m.state,
  });
  const last = states.at(-1);
  return last?.status === 'error' ? last.error : null;
}
