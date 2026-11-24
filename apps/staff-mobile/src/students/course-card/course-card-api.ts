import {
  courseActionsKey,
  courseCardKey,
  courseCardPath,
  courseExtendPreviewPath,
  coursePauseKey,
  courseResumePreviewPath,
  parseCourseCard,
  parseExtendPreview,
  parseResumePreview,
  postCourseExtend,
  readLessonAt,
  type CardTree,
} from '@ab/client-core';
import type { CourseCardLesson, LessonView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

// Paths, keys and parsers are shared with web through @ab/client-core.

/** GET the card: the admin's route or the assistant's (any student). */
export const useCourseCard = (input: { studentId: string; tree: CardTree }) =>
  useQuery({
    queryKey: [...courseCardKey(input.studentId), input.tree],
    queryFn: async () => parseCourseCard(await apiFetch(courseCardPath(input))),
    enabled: input.studentId !== '',
  });

/**
 * A card lesson's full view for the admin's sheet (GET /lessons over its minute, lessons.read),
 * only once tapped; null = moved or cancelled meanwhile.
 */
export const useCardLesson = (lesson: CourseCardLesson | null) =>
  useQuery({
    queryKey: ['course-card-lesson', lesson?.id],
    queryFn: () => (lesson ? readLessonAt<LessonView>(apiFetch, lesson) : null),
    enabled: lesson !== null,
    staleTime: 0,
  });

export const useExtendPreview = (input: { studentId: string; subscriptionId: string }) =>
  useQuery({
    queryKey: [...courseCardKey(input.studentId), 'extend', input.subscriptionId],
    queryFn: async () => parseExtendPreview(await apiFetch(courseExtendPreviewPath(input))),
  });

/** Only fetched while asking. */
export const useResumePreview = (input: { studentId: string; enabled: boolean }) =>
  useQuery({
    queryKey: [...courseCardKey(input.studentId), 'resume'],
    queryFn: async () =>
      parseResumePreview(await apiFetch(courseResumePreviewPath(input.studentId))),
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
    const stale = keys.map((queryKey) => client.invalidateQueries({ queryKey: [...queryKey] }));
    await Promise.all(stale);
  };
}

/** Idempotent: with nothing left, nothing is booked. */
export function useExtendCourse(studentId: string) {
  const refresh = useCardRefresh(studentId);
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      postCourseExtend(apiFetch, { studentId, subscriptionId }),
    onSuccess: refresh,
  });
}
