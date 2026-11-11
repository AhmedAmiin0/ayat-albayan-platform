import { teacherLessonPaths } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';

const confirmAttendance = (lessonId: string): Promise<LessonView> =>
  apiSend('POST', teacherLessonPaths.confirm(lessonId));

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
