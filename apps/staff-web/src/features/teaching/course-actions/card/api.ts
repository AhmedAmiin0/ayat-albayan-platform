import {
  courseCardKey,
  courseCardPath,
  courseExtendPreviewPath,
  parseCourseCard,
  parseExtendPreview,
  postCourseExtend,
  type CardTree,
} from '@ab/client-core';
import type { CourseExtendResult } from '@ab/shared';
import { queryOptions, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';
import { useInvalidateCourseActions } from '@/features/teaching/course-actions/api';

// «الدورة والباقة» (owner 2026-11-17): the card, «مدّ الجدول» and the resume's preview. Paths, keys
// and parsers come from @ab/client-core (the same as mobile); the card's key sits under the course
// actions' key, so every action's re-read refreshes it.

export const courseCardQuery = (input: { studentId: string; tree: CardTree }) =>
  queryOptions({
    queryKey: [...courseCardKey(input.studentId), input.tree],
    queryFn: async () => parseCourseCard(await apiFetch(courseCardPath(input))),
  });

export const extendPreviewQuery = (input: { studentId: string; subscriptionId: string }) =>
  queryOptions({
    queryKey: [...courseCardKey(input.studentId), 'extend', input.subscriptionId],
    queryFn: async () => parseExtendPreview(await apiFetch(courseExtendPreviewPath(input))),
  });

/** POST «مدّ الجدول», then the re-read (the card, the student, the lessons). */
export function useExtendCourse(input: {
  studentId: string;
  subscriptionId: string;
  onDone: (result: CourseExtendResult) => void;
}) {
  const invalidate = useInvalidateCourseActions(input.studentId);
  return useMutation({
    mutationFn: () => postCourseExtend(apiFetch, input),
    onSuccess: async (result) => {
      await invalidate();
      input.onDone(result);
    },
  });
}
