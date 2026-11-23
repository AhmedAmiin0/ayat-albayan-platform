import { nextLesson } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { teacherLabel } from '@ab/web-kit/i18n';
import { useNow } from '@ab/web-kit/time';
import { portalLessonsQuery } from '@ab/web-kit/portal';

/**
 * «حسابي»'s child row: the teacher of the child's next lesson (the lessons read the home shares),
 * in the UI language; null while loading or with no lesson ahead.
 */
export function useChildTeacher(studentId: string): string | null {
  const lessons = useQuery(portalLessonsQuery(studentId)).data?.lessons ?? [];
  const next = nextLesson(lessons, useNow());
  return next ? teacherLabel(next.teacher) : null;
}
