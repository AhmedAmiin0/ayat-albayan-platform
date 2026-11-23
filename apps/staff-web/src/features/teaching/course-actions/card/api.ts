import {
  courseCardKey,
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

/**
 * A card lesson's full view for the admin's drawer (GET /lessons over its minute, lessons.read);
 * null = moved or cancelled meanwhile. Not under ['lessons']: the drawer's refresh would empty it.
 */
export const cardLessonQuery = (lesson: CourseCardLesson) =>
  queryOptions({
    queryKey: ['course-card-lesson', lesson.id],
    queryFn: () => readLessonAt<LessonView>(apiFetch, lesson),
    staleTime: 0,
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
