import { cancelAnswerSchema, teacherLessonPaths } from '@ab/client-core';
import type { TeacherCancelRequest } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiSend } from '@ab/web-kit';
import { patchMyLesson } from '@/features/teaching/teacher/patch-my-lesson';

/** apiSend with its reply left unknown, for the schema to parse. */
type Post = (method: 'POST', path: string, body: TeacherCancelRequest) => Promise<unknown>;
const post: Post = apiSend;

/** The answer (a LessonView) parsed at the boundary (rule 12); another shape patches nothing. */
const cancelOne = async (lessonId: string, body: TeacherCancelRequest) =>
  cancelAnswerSchema.safeParse(await post('POST', teacherLessonPaths.cancel(lessonId), body)).data;

/** Teacher cancel before start via her own route (docs/46 C3); write-through cache (docs/48). */
export function useTeacherCancel(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TeacherCancelRequest) => cancelOne(lessonId, body),
    onSuccess: (answer) => answer && patchMyLesson(client, { id: lessonId, patch: answer }),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}
