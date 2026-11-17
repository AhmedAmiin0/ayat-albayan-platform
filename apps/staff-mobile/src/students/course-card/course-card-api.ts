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
  type CardTree,
} from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

// «الدورة والباقة» (owner 2026-11-17): the card, «مدّ الجدول» and the resume's preview; paths,
// keys and parsers are @ab/client-core's, shared with web.

/** GET the card: the admin's route or the assistant's (any student). */
export const useCourseCard = (input: { studentId: string; tree: CardTree }) =>
  useQuery({
    queryKey: [...courseCardKey(input.studentId), input.tree],
    queryFn: async () => parseCourseCard(await apiFetch(courseCardPath(input))),
    enabled: input.studentId !== '',
  });

/** GET «مدّ الجدول»'s preview of the package. */
export const useExtendPreview = (input: { studentId: string; subscriptionId: string }) =>
  useQuery({
    queryKey: [...courseCardKey(input.studentId), 'extend', input.subscriptionId],
    queryFn: async () => parseExtendPreview(await apiFetch(courseExtendPreviewPath(input))),
  });

/** GET what «استئناف الدورة» does now (only while asking). */
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

/** POST «مدّ الجدول» { subscriptionId }: idempotent (nothing left, nothing booked). */
export function useExtendCourse(studentId: string) {
  const refresh = useCardRefresh(studentId);
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      postCourseExtend(apiFetch, { studentId, subscriptionId }),
    onSuccess: refresh,
  });
}
