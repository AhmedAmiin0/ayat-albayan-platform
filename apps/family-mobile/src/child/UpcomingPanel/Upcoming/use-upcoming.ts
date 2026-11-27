import { nextLesson } from '@ab/client-core';
import type { PortalLessons } from '@ab/shared';
import { useNow } from '@ab/mobile-kit';

export function useUpcoming(lessons: PortalLessons) {
  const now = useNow();
  const next = nextLesson(lessons.lessons, now);
  return { now, next };
}
