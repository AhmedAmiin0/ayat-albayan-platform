import {
  coursePauseKey,
  coursePausePath,
  coursePausePreviewPath,
  coursePauseResumePath,
  coursePauseUntilPath,
} from '@ab/client-core';
import type { CoursePausePreview, CoursePauseResult, CoursePauseStart, CoursePauseState } from '@ab/shared';
import { keepPreviousData, queryOptions, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// «إيقاف الدورة مؤقتًا» (owner 2026-10-28): apps/api/src/modules/teaching/course-pause. Paths and the key
// come from @ab/client-core (the same as mobile).

export const coursePauseQuery = (studentId: string) =>
  queryOptions({
    queryKey: coursePauseKey(studentId),
    queryFn: () => apiFetch<CoursePauseState>(coursePausePath(studentId)),
  });

/** «ستُلغى N حلقات…»: the lessons the window would take the student out of. */
export const coursePausePreviewQuery = (input: { studentId: string; from: string; until: string | null }) =>
  queryOptions({
    queryKey: [...coursePauseKey(input.studentId), 'preview', input.from, input.until],
    queryFn: () => apiFetch<CoursePausePreview>(coursePausePreviewPath(input)),
    placeholderData: keepPreviousData,
  });

export const startCoursePause = (studentId: string, body: CoursePauseStart) =>
  apiSend<CoursePauseResult>('POST', coursePausePath(studentId), body);

export const changePauseUntil = (studentId: string, untilDate: string | null) =>
  apiSend<CoursePauseResult>('PATCH', coursePauseUntilPath(studentId), { untilDate });

export const resumeCoursePause = (studentId: string) => apiSend<CoursePauseResult>('POST', coursePauseResumePath(studentId));

/**
 * After any write: the pause state, the student (file and lists: the status chip) and the money (the
 * package's status and dates). Literal roots (['students'] = STUDENTS_KEY, ['money'] = MONEY_KEY) keep this
 * feature free of an import cycle with the two features that render it.
 */
export function useInvalidatePause(studentId: string): () => Promise<void> {
  const client = useQueryClient();
  return async () => {
    await Promise.all(
      [coursePauseKey(studentId), ['students'], ['money']].map((queryKey) => client.invalidateQueries({ queryKey })),
    );
  };
}
