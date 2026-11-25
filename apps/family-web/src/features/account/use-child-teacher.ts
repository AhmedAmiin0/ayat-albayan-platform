import { nextLesson } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { teacherLabel, useNow, portalLessonsQuery } from '@ab/web-kit';

/** In the UI language; null while loading or with no lesson ahead. */
export function useChildTeacher(studentId: string): string | null {
  const lessons = useQuery(portalLessonsQuery(studentId)).data?.lessons ?? [];
  const next = nextLesson(lessons, useNow());
  return next ? teacherLabel(next.teacher) : null;
}
