import { confirmAnswerSchema, teacherLessonPaths } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';

/** apiSend with its reply left unknown, for the schema to parse. */
const post: (method: 'POST', path: string) => Promise<unknown> = apiSend;

/** The answer's fields the chip reads (rule 12); an unexpected shape is no answer. */
const confirmAttendance = async (lessonId: string) =>
  confirmAnswerSchema.safeParse(await post('POST', teacherLessonPaths.confirm(lessonId))).data;

/**
 * «سأحضر» (docs/46 C4, D1): POST /teachers/me/lessons/:id/confirm-attendance. The status stays;
 * the lessons re-read so the card shows «حضورك مؤكَّد».
 */
export function useTeacherConfirm(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => confirmAttendance(lessonId),
    onSettled: () => client.invalidateQueries({ queryKey: LESSONS_KEY }),
  });
}
