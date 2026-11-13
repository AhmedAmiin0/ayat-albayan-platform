import { cancelAnswerSchema, teacherLessonPaths } from '@ab/client-core';
import type { TeacherCancelRequest } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';
import { patchMyLesson } from './patch-my-lesson';

/** apiSend with its reply left unknown, for the schema to parse. */
type Post = (method: 'POST', path: string, body: TeacherCancelRequest) => Promise<unknown>;
const post: Post = apiSend;

/** The answer (a LessonView) parsed at the boundary (rule 12); another shape patches nothing. */
const cancelOne = async (lessonId: string, body: TeacherCancelRequest) =>
  cancelAnswerSchema.safeParse(await post('POST', teacherLessonPaths.cancel(lessonId), body)).data;

/**
 * «إلغاء الحلقة» by the teacher (docs/46 C3, D3): this lesson only, a reason, before its start.
 * Her own route, never the admin's /lessons/:id/cancel. Write-through (docs/48): the answer closes
 * the cached row before the re-read; a refusal changes nothing. No ['teachers','me'] refetch.
 */
export function useTeacherCancel(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TeacherCancelRequest) => cancelOne(lessonId, body),
    onSuccess: (answer) => answer && patchMyLesson(client, { id: lessonId, patch: answer }),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}
