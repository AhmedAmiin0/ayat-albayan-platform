import { nextLesson } from '@ab/client-core';
import { useNow } from '@ab/mobile-kit';
import { useChildLessons } from '@/portal';

export function useChildNextLine(studentId: string) {
  const now = useNow();
  const lessons = useChildLessons(studentId).data;
  const next = lessons && nextLesson(lessons.lessons, now);
  return { now, lessons, next };
}
