import { confirmAnswerSchema, teacherLessonPaths } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';
import {
  holdMyLessons,
  patchMyLesson,
  restoreMyLessons,
} from '@/features/teaching/teacher/patch-my-lesson';

/** apiSend with its reply left unknown, for the schema to parse. */
const post: (method: 'POST', path: string) => Promise<unknown> = apiSend;

/** The answer's fields the chip reads (rule 12); an unexpected shape is no answer. */
const confirmAttendance = async (lessonId: string) =>
  confirmAnswerSchema.safeParse(await post('POST', teacherLessonPaths.confirm(lessonId))).data;

/**
 * «سأحضر» (docs/46 C4, D1): POST /teachers/me/lessons/:id/confirm-attendance. Optimistic (docs/48):
 * her cached lists say «حضورك مؤكَّد» at once, a refusal puts them back, and the lessons re-read
 * either way. Nothing under ['teachers','me'] changes, so it is not refetched.
 */
export function useTeacherConfirm(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => confirmAttendance(lessonId),
    onMutate: async () => {
      await holdMyLessons(client);
      const patch = { teacher_confirmed_at: new Date().toISOString() };
      return patchMyLesson(client, { id: lessonId, patch });
    },
    onError: (_error, _vars, snapshot) => restoreMyLessons(client, snapshot),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}
