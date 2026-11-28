import {
  courseActionsKey,
  courseCardCalls,
  courseKeys,
  coursePauseCalls,
  coursePauseKey,
  pauseKeys,
  readLessonAt,
  type CardTree,
} from '@ab/client-core';
import type { CourseCardLesson } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

// Calls, paths and keys are shared with web through @ab/client-core.

const calls = courseCardCalls({ apiFetch, apiSend });
const pauses = coursePauseCalls({ apiFetch, apiSend });

/** GET the card: the admin's route or the assistant's (any student). */
export const useCourseCard = (input: { studentId: string; tree: CardTree }) =>
  useQuery({
    queryKey: courseKeys.card(input.studentId, input.tree),
    queryFn: () => calls.card(input),
    enabled: input.studentId !== '',
  });

/**
 * A card lesson's full view for the admin's sheet (GET /lessons over its minute, lessons.read),
 * only once tapped; null = moved or cancelled meanwhile.
 */
export const useCardLesson = (lesson: CourseCardLesson | null) =>
  useQuery({
    queryKey: courseKeys.cardLesson(lesson?.id ?? ''),
    queryFn: () => (lesson ? readLessonAt<LessonView>(apiFetch, lesson) : null),
    enabled: lesson !== null,
    staleTime: 0,
  });

export const useExtendPreview = (input: { studentId: string; subscriptionId: string }) =>
  useQuery({
    queryKey: courseKeys.extend(input),
    queryFn: () => calls.extendPreview(input),
  });

/** Only fetched while asking. */
export const useResumePreview = (input: { studentId: string; enabled: boolean }) =>
  useQuery({
    queryKey: pauseKeys.resume(input.studentId),
    queryFn: () => pauses.resumePreview(input.studentId),
    enabled: input.enabled,
  });

/** After any course action: the card, the actions, the pause, the files, sales, lessons. */
function useCardRefresh(studentId: string) {
  const client = useQueryClient();
  const keys = [
    courseActionsKey(studentId),
    coursePauseKey(studentId),
    pathKey('/students'),
    pathKey('/sales'),
    pathKey('/lessons'),
  ];
  return async (): Promise<void> => {
    const stale = keys.map((queryKey) => client.invalidateQueries({ queryKey }));
    await Promise.all(stale);
  };
}

/** Idempotent: with nothing left, nothing is booked. */
export function useExtendCourse(studentId: string) {
  const refresh = useCardRefresh(studentId);
  return useMutation({
    mutationFn: (subscriptionId: string) => calls.extend({ studentId, subscriptionId }),
    onSuccess: refresh,
  });
}
