import {
  courseActionsKey,
  coursePauseKey,
  courseResumePreviewPath,
  parseResumePreview,
  coursePausePath,
  coursePausePreviewPath,
  coursePauseResumePath,
  coursePauseUntilPath,
  pauseKeys,
} from '@ab/client-core';
import type {
  CoursePausePreview,
  CoursePauseResult,
  CoursePauseStart,
  CoursePauseState,
} from '@ab/shared';
import { keepPreviousData, queryOptions, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// Paths and the key come from @ab/client-core, the same as mobile.

export const coursePauseQuery = (studentId: string) =>
  queryOptions({
    queryKey: coursePauseKey(studentId),
    queryFn: () => apiFetch<CoursePauseState>(coursePausePath(studentId)),
  });

/** The lessons the window would take the student out of. */
export const coursePausePreviewQuery = (input: {
  studentId: string;
  from: string;
  until: string | null;
}) =>
  queryOptions({
    queryKey: pauseKeys.preview(input),
    queryFn: () => apiFetch<CoursePausePreview>(coursePausePreviewPath(input)),
    placeholderData: keepPreviousData,
  });

/** The lessons coming back and the days the package moves. */
export const resumePreviewQuery = (studentId: string) =>
  queryOptions({
    queryKey: pauseKeys.resume(studentId),
    queryFn: async () => parseResumePreview(await apiFetch(courseResumePreviewPath(studentId))),
    retry: false,
  });

export const startCoursePause = (studentId: string, body: CoursePauseStart) =>
  apiSend<CoursePauseResult>('POST', coursePausePath(studentId), body);

export const changePauseUntil = (studentId: string, untilDate: string | null) =>
  apiSend<CoursePauseResult>('PATCH', coursePauseUntilPath(studentId), { untilDate });

/** A package row's resume passes subscriptionId for its pause; the banner passes none. */
export const resumeCoursePause = (studentId: string, subscriptionId?: string) =>
  subscriptionId
    ? apiSend<CoursePauseResult>('POST', coursePauseResumePath(studentId), { subscriptionId })
    : apiSend<CoursePauseResult>('POST', coursePauseResumePath(studentId));

/**
 * After any write: the pause state, the student (file and lists: the status chip) and the money (the
 * package's status and dates). Literal roots (['students'] = STUDENTS_KEY, ['money'] = MONEY_KEY) keep this
 * feature free of an import cycle with the two features that render it.
 */
export function useInvalidatePause(studentId: string): () => Promise<void> {
  const client = useQueryClient();
  return async () => {
    await Promise.all(
      [coursePauseKey(studentId), courseActionsKey(studentId), ['students'], ['money']].map(
        (queryKey) => client.invalidateQueries({ queryKey }),
      ),
    );
  };
}
