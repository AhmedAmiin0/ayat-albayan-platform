import type { TeacherCancelRequest } from '@ab/shared';
import { confirmAnswerSchema, teacherLessonPaths } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';

// docs/46 C3/C4: the teacher's own lesson routes (self.teacher), never the admin's /lessons/:id/*.

const errorBody = z.object({ code: z.string() });

/** A refused teacher action in words: 409 lesson_started says so, else the general line. */
const ERROR_TEXT: Record<string, string | undefined> = {
  lesson_started: t.teacherBoard.lessonStarted,
};

const codeOf = (error: unknown): string | undefined => {
  const body = error instanceof ApiError ? errorBody.safeParse(error.body) : null;
  return body?.success ? body.data.code : undefined;
};

export function teacherActionError(error: unknown): string {
  return ERROR_TEXT[codeOf(error) ?? ''] ?? t.teacherBoard.actionFailed;
}

/** apiSend with its reply left unknown, for the schema to parse. */
const post: (method: 'POST', path: string) => Promise<unknown> = apiSend;

/** «اليوم», «جدولي» and the board read GET /teachers/me/lessons under ['lessons']: refetch them. */
function useRefreshLessons() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: pathKey('/lessons') });
}

/** POST /teachers/me/lessons/:id/confirm-attendance: «سأحضر» (D1), the status never changes. */
export function useTeacherConfirm(lessonId: string) {
  const refresh = useRefreshLessons();
  return useMutation({
    // The answer bridges the chip until the refetch brings the lesson (confirmedNow).
    mutationFn: async () =>
      confirmAnswerSchema.safeParse(await post('POST', teacherLessonPaths.confirm(lessonId))).data,
    // A 409 refetches too, so a stale button goes.
    onSettled: refresh,
  });
}

/** POST /teachers/me/lessons/:id/cancel {reason}: this lesson only, before it starts (D3). */
export function useTeacherCancel(lessonId: string) {
  const refresh = useRefreshLessons();
  return useMutation({
    mutationFn: (body: TeacherCancelRequest) =>
      apiSend('POST', teacherLessonPaths.cancel(lessonId), body),
    onSettled: refresh,
  });
}
