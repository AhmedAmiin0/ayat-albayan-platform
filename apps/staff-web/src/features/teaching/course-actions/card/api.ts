import {
  courseCardPath,
  courseExtendPreviewPath,
  parseCourseCard,
  parseExtendPreview,
  postCourseExtend,
  readLessonAt,
  type CardTree,
} from '@ab/client-core';
import type { CourseCardLesson, CourseExtendResult } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { queryOptions, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit/lib/http/api';
import { useInvalidateCourseActions } from '@/features/teaching/course-actions/api';
import { courseKeys } from '@/features/teaching/course-actions/course.keys';

// Paths, keys and parsers come from @ab/client-core; the card key sits under the actions' key.

export const courseCardQuery = (input: { studentId: string; tree: CardTree }) =>
  queryOptions({
    queryKey: courseKeys.card(input.studentId, input.tree),
    queryFn: async () => parseCourseCard(await apiFetch(courseCardPath(input))),
  });

export const extendPreviewQuery = (input: { studentId: string; subscriptionId: string }) =>
  queryOptions({
    queryKey: courseKeys.extend(input),
    queryFn: async () => parseExtendPreview(await apiFetch(courseExtendPreviewPath(input))),
  });

/**
 * A card lesson's full view for the admin's drawer (GET /lessons over its minute, lessons.read);
 * null = moved or cancelled meanwhile. Not under ['lessons']: the drawer's refresh would empty it.
 */
export const cardLessonQuery = (lesson: CourseCardLesson) =>
  queryOptions({
    queryKey: courseKeys.cardLesson(lesson.id),
    queryFn: () => readLessonAt<LessonView>(apiFetch, lesson),
    staleTime: 0,
  });

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
